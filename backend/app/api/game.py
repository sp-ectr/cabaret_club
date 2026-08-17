import json
import time
import uuid
from datetime import datetime, timezone
from typing import Literal, cast
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from redis.asyncio import Redis

from app.core.db import get_session
from app.core.redis import get_redis
from app.core.security import get_current_guest
from app.models.user import User
from app.models.hostess import UserHostess
from app.models.shift import ShiftHistory
from app.schemas.game import (
    GameInitResponse,
    PlayerDTO,
    HostessStateDTO,
    UpgradesDTO,
)
from app.schemas.shop import (
    ShopBuyRequest,
    ShopBuyResponse,
    ClubUpgradeResponse,
)
from app.schemas.shift import ShiftStateResponse, ShiftReportDTO, TableDTO
from app.core.balance import (
    RENT_BY_TIER,
    HOSTESS_WAGE_PER_SHIFT,
    BOUNCER_COST_PER_SHIFT,
    BOMZH_PLACATE_LOSS_YEN,
    UPGRADE_COSTS,
    TIER_UPGRADE_COSTS,
    STAMINA_MAX,
    SLEEP_STAMINA_RESTORE,
    STAMINA_READY_MIN,
    STAMINA_TIRED_MIN,
    ORPHAN_TIMEOUT_SEC,
    SHIFT_DURATION_SEC,
    ZERO_STAFF_BANKRUPTCY_THRESHOLD_YEN,
)

router = APIRouter(prefix="/api", tags=["Game"])

async def _is_shift_active(redis: Redis, device_id) -> bool:
    raw = await redis.hgetall(f"session:{device_id}")
    if not raw:
        return False
    started_at = int(raw.get("started_at", 0))
    return (int(time.time()) - started_at) <= ORPHAN_TIMEOUT_SEC

def _recalculate_flags(user: User, hostesses: list[UserHostess]) -> None:
    if cast(int, user.yen) < 0:
        user.defeat = True

    available = [h for h in hostesses if h.hired and cast(int, h.stamina) >= STAMINA_TIRED_MIN]
    if len(available) == 0 and cast(int, user.yen) < ZERO_STAFF_BANKRUPTCY_THRESHOLD_YEN:
        user.defeat = True

    ready = [h for h in hostesses if h.hired and cast(int, h.stamina) >= STAMINA_READY_MIN]
    if cast(int, user.club_tier) == 3 and len(ready) >= 3:
        user.victory = True

@router.get("/game/init", response_model=GameInitResponse)
async def init_game(
    user: User = Depends(get_current_guest),
    session: AsyncSession = Depends(get_session),
    redis: Redis = Depends(get_redis),
):
    current_time = int(time.time())
    session_key = f"session:{user.device_id}"
    lock_key = f"lock:shift:{user.device_id}"

    stmt = select(UserHostess).where(UserHostess.device_id == user.device_id)
    res = await session.execute(stmt)
    hostesses = list(res.scalars().all())

    active_shift_resp = None
    auto_closed_report = None

    raw_session = await redis.hgetall(session_key)
    if raw_session:
        started_at = int(raw_session.get("started_at", 0))
        elapsed = current_time - started_at
        shift_id_str = raw_session.get("shift_id", "")

        # ORPHAN RESOLVER: Автофинализация брошенной смены
        if elapsed > ORPHAN_TIMEOUT_SEC:
            finalize_lock_key = f"finalize_lock:{shift_id_str}"
            acquired = await redis.set(finalize_lock_key, "1", nx=True, ex=30)

            if acquired:
                shift_uuid = uuid.UUID(shift_id_str)
                tier = int(raw_session.get("tier", 1))
                has_bouncer = raw_session.get("has_bouncer") == "true"
                roster_ids = [x for x in raw_session.get("roster", "").split(",") if x]
                placated_count = int(raw_session.get("bomzh_placated_count", 0))
                gross_income = int(raw_session.get("gross_income", 0))

                rent_cost = RENT_BY_TIER[tier]
                fot_cost = len(roster_ids) * HOSTESS_WAGE_PER_SHIFT
                bouncer_cost = BOUNCER_COST_PER_SHIFT if has_bouncer else 0
                bomzh_losses = placated_count * BOMZH_PLACATE_LOSS_YEN
                total_expenses = rent_cost + fot_cost + bouncer_cost + bomzh_losses
                net_yen = gross_income - total_expenses

                user.yen = cast(int, user.yen) + net_yen

                # Применяем серверную стамину из Redis и сон +20
                server_stamina = json.loads(raw_session.get("server_stamina_json", "{}"))
                for h in hostesses:
                    if h.hostess_id in server_stamina:
                        h.stamina = server_stamina[h.hostess_id]
                    if h.hired:
                        h.stamina = min(STAMINA_MAX, cast(int, h.stamina) + SLEEP_STAMINA_RESTORE)

                _recalculate_flags(user, hostesses)

                history = ShiftHistory(
                    shift_id=shift_uuid,
                    device_id=user.device_id,
                    club_tier=tier,
                    started_at=datetime.fromtimestamp(started_at, tz=timezone.utc),
                    ended_at=datetime.fromtimestamp(started_at + SHIFT_DURATION_SEC, tz=timezone.utc),
                    guests_served=int(raw_session.get("served_count", 0)),
                    guests_angry=int(raw_session.get("angry_count", 0)),
                    bomzh_blocked=int(raw_session.get("bomzh_blocked_count", 0)),
                    bomzh_placated=placated_count,
                    gross_yen=gross_income,
                    vip_tips_yen=0,
                    rent_yen=rent_cost,
                    fot_yen=fot_cost,
                    bouncer_yen=bouncer_cost,
                    bomzh_loss_yen=bomzh_losses,
                    net_yen=net_yen,
                    clamped=False,
                )

                try:
                    session.add(history)
                    await session.commit()
                    await session.refresh(user)
                    await redis.delete(session_key, lock_key)

                    auto_closed_report = ShiftReportDTO(
                        shift_id=str(shift_uuid),
                        club_tier=cast(Literal[1, 2, 3], tier),
                        started_at=started_at,
                        ended_at=started_at + SHIFT_DURATION_SEC,
                        guests_served=int(history.guests_served),
                        guests_lost_angry=int(history.guests_angry),
                        bomzh_blocked=int(history.bomzh_blocked),
                        bomzh_placated=int(history.bomzh_placated),
                        gross_yen=int(gross_income),
                        vip_tips_yen=0,
                        rent_yen=rent_cost,
                        fot_yen=fot_cost,
                        bouncer_yen=bouncer_cost,
                        bomzh_loss_yen=bomzh_losses,
                        net_yen=net_yen,
                    )
                except IntegrityError:
                    # Запись уже в базе (failover) — откатываемся и отдаем сохраненный отчет
                    await session.rollback()
                    stmt_hist = select(ShiftHistory).where(ShiftHistory.shift_id == shift_uuid)
                    existing = (await session.execute(stmt_hist)).scalar_one()
                    await session.refresh(user)
                    await redis.delete(session_key, lock_key)

                    auto_closed_report = ShiftReportDTO(
                        shift_id=str(existing.shift_id),
                        club_tier=cast(Literal[1, 2, 3], existing.club_tier),
                        started_at=int(existing.started_at.timestamp()),
                        ended_at=int(existing.ended_at.timestamp()),
                        guests_served=int(existing.guests_served),
                        guests_lost_angry=int(existing.guests_angry),
                        bomzh_blocked=int(existing.bomzh_blocked),
                        bomzh_placated=int(existing.bomzh_placated),
                        gross_yen=int(existing.gross_yen),
                        vip_tips_yen=int(existing.vip_tips_yen),
                        rent_yen=int(existing.rent_yen),
                        fot_yen=int(existing.fot_yen),
                        bouncer_yen=int(existing.bouncer_yen),
                        bomzh_loss_yen=int(existing.bomzh_loss_yen),
                        net_yen=int(existing.net_yen),
                    )
        else:
            # Смена активна -> возвращаем полный срез
            time_rem = max(0, SHIFT_DURATION_SEC - elapsed)
            server_stamina = json.loads(raw_session.get("server_stamina_json", "{}"))
            tables_data = json.loads(raw_session.get("tables_json", "[]"))
            roster_ids = [x for x in raw_session.get("roster", "").split(",") if x]

            active_shift_resp = ShiftStateResponse(
                is_active=True,
                shift_id=shift_id_str,
                started_at=started_at,
                time_remaining=time_rem,
                seed=int(raw_session.get("seed", 0)),
                tier=int(raw_session.get("tier", 1)),
                roster=[
                    HostessStateDTO(
                        id=cast(Literal["YUKI", "MIRA", "SAKURA", "NIKA", "LUNA"], hid),
                        hired=True,
                        stamina=int(server_stamina.get(hid, 100)),
                    )
                    for hid in roster_ids
                ],
                has_bouncer=raw_session.get("has_bouncer") == "true",
                tables=[TableDTO.model_validate(t) for t in tables_data] if tables_data else None,
                gross_income=int(raw_session.get("gross_income", 0)),
            )

    return GameInitResponse(
        player=PlayerDTO(
            yen=cast(int, user.yen),
            club_tier=cast(Literal[1, 2, 3], user.club_tier),
            victory=cast(bool, user.victory),
            defeat=cast(bool, user.defeat),
        ),
        hostesses=[
            HostessStateDTO(
                id=cast(Literal["YUKI", "MIRA", "SAKURA", "NIKA", "LUNA"], h.hostess_id),
                hired=cast(bool, h.hired),
                stamina=cast(int, h.stamina),
            )
            for h in sorted(hostesses, key=lambda x: str(x.hostess_id))
        ],
        upgrades=UpgradesDTO(
            vip_interior=cast(bool, user.vip_interior),
            premium_bar=cast(bool, user.premium_bar),
            neon_sign=cast(bool, user.neon_sign),
            etiquette=cast(bool, user.etiquette),
        ),
        server_time=current_time,
        active_shift=active_shift_resp,
        auto_closed_shift=auto_closed_report,
    )

@router.post("/shop/buy", response_model=ShopBuyResponse)
async def buy_upgrade(
    payload: ShopBuyRequest,
    user: User = Depends(get_current_guest),
    session: AsyncSession = Depends(get_session),
    redis: Redis = Depends(get_redis),
):
    if user.defeat:
        raise HTTPException(status_code=400, detail={"error": {"code": "GAME_OVER", "message": "Game is over"}})

    if await _is_shift_active(redis, user.device_id):
        raise HTTPException(status_code=409, detail={"error": {"code": "SHIFT_ALREADY_ACTIVE", "message": "Cannot buy upgrades during an active shift"}})

    cost = UPGRADE_COSTS.get(payload.upgrade_id)
    if cost is None:
        raise HTTPException(status_code=422, detail={"error": {"code": "VALIDATION", "message": "Unknown upgrade id"}})

    stmt_user = select(User).where(User.device_id == user.device_id).with_for_update()
    res_user = await session.execute(stmt_user)
    locked_user = res_user.scalar_one()

    upgrade_field = payload.upgrade_id.lower()
    if getattr(locked_user, upgrade_field, False):
        raise HTTPException(status_code=400, detail={"error": {"code": "ALREADY_OWNED", "message": "Upgrade is already owned"}})

    if payload.upgrade_id == "VIP_INTERIOR" and cast(int, locked_user.club_tier) < 2:
        raise HTTPException(status_code=400, detail={"error": {"code": "TIER_TOO_LOW", "message": "VIP Interior requires Club Tier 2"}})

    if cast(int, locked_user.yen) < cost:
        raise HTTPException(status_code=400, detail={"error": {"code": "INSUFFICIENT_FUNDS", "message": "Not enough yen"}})

    locked_user.yen = cast(int, locked_user.yen) - cost
    setattr(locked_user, upgrade_field, True)

    await session.commit()
    await session.refresh(locked_user)

    return ShopBuyResponse(
        player=PlayerDTO(
            yen=cast(int, locked_user.yen),
            club_tier=cast(Literal[1, 2, 3], locked_user.club_tier),
            victory=cast(bool, locked_user.victory),
            defeat=cast(bool, locked_user.defeat),
        ),
        upgrades=UpgradesDTO(
            vip_interior=cast(bool, locked_user.vip_interior),
            premium_bar=cast(bool, locked_user.premium_bar),
            neon_sign=cast(bool, locked_user.neon_sign),
            etiquette=cast(bool, locked_user.etiquette),
        ),
    )

@router.post("/club/upgrade", response_model=ClubUpgradeResponse)
async def upgrade_club(
    user: User = Depends(get_current_guest),
    session: AsyncSession = Depends(get_session),
    redis: Redis = Depends(get_redis),
):
    if user.defeat:
        raise HTTPException(status_code=400, detail={"error": {"code": "GAME_OVER", "message": "Game is over"}})

    if await _is_shift_active(redis, user.device_id):
        raise HTTPException(status_code=409, detail={"error": {"code": "SHIFT_ALREADY_ACTIVE", "message": "Cannot upgrade club during an active shift"}})

    stmt_user = select(User).where(User.device_id == user.device_id).with_for_update()
    res_user = await session.execute(stmt_user)
    locked_user = res_user.scalar_one()

    current_tier = cast(int, locked_user.club_tier)
    if current_tier >= 3:
        raise HTTPException(status_code=400, detail={"error": {"code": "TIER_MAXED", "message": "Club is already at maximum tier"}})

    cost = TIER_UPGRADE_COSTS.get(current_tier + 1)
    if not cost or cast(int, locked_user.yen) < cost:
        raise HTTPException(status_code=400, detail={"error": {"code": "INSUFFICIENT_FUNDS", "message": "Not enough yen"}})

    locked_user.yen = cast(int, locked_user.yen) - cost
    locked_user.club_tier = current_tier + 1

    stmt = select(UserHostess).where(UserHostess.device_id == locked_user.device_id)
    res = await session.execute(stmt)
    hostesses = list(res.scalars().all())

    _recalculate_flags(locked_user, hostesses)

    await session.commit()
    await session.refresh(locked_user)

    return ClubUpgradeResponse(
        player=PlayerDTO(
            yen=cast(int, locked_user.yen),
            club_tier=cast(Literal[1, 2, 3], locked_user.club_tier),
            victory=cast(bool, locked_user.victory),
            defeat=cast(bool, locked_user.defeat),
        ),
        victory=cast(bool, locked_user.victory),
    )
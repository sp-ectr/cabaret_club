# backend/app/api/shift.py
import json
import random
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
from app.core.security import get_current_guest, get_tab_id
from app.models.user import User
from app.models.hostess import UserHostess
from app.models.shift import ShiftHistory
from app.schemas.shift import (
    ShiftStartRequest,
    ShiftStartResponse,
    ShiftActionRequest,
    ShiftActionResponse,
    ShiftStateResponse,
    ShiftCompleteRequest,
    ShiftCompleteResponse,
    ShiftReportDTO,
    TableDTO,
)
from app.schemas.game import PlayerDTO, HostessStateDTO
from app.core.balance import (
    SHIFT_DURATION_SEC,
    GRACE_MIN_SEC,
    GRACE_MAX_SEC,
    SESSION_TTL_SEC,
    LOCK_TTL_SEC,
    RENT_BY_TIER,
    HOSTESS_WAGE_PER_SHIFT,
    BOUNCER_COST_PER_SHIFT,
    BOMZH_PLACATE_LOSS_YEN,
    BOMZH_PLACATE_STAMINA_DRAIN,
    STAMINA_DRAIN_NORMAL,
    STAMINA_DRAIN_ETIQUETTE,
    STAMINA_BAR_EXTRA,
    MAJIMA_START_SEC,
    MAJIMA_STAMINA_RESTORE,
    STAMINA_MAX,
    STAMINA_READY_MIN,
    STAMINA_TIRED_MIN,
    SLEEP_STAMINA_RESTORE,
    MAX_ACTIONS_PER_SECOND,
    MAX_ALLOWED_GROSS_YEN,
    MAX_ALLOWED_VIP_TIPS_YEN,
    ZERO_STAFF_BANKRUPTCY_THRESHOLD_YEN,
)

router = APIRouter(prefix="/api/shift", tags=["Shift"])

def _recalculate_flags(user: User, hostesses: list[UserHostess]) -> None:
    if cast(int, user.yen) < 0:
        user.defeat = True

    available = [h for h in hostesses if h.hired and cast(int, h.stamina) >= STAMINA_TIRED_MIN]
    if len(available) == 0 and cast(int, user.yen) < ZERO_STAFF_BANKRUPTCY_THRESHOLD_YEN:
        user.defeat = True

    ready = [h for h in hostesses if h.hired and cast(int, h.stamina) >= STAMINA_READY_MIN]
    if cast(int, user.club_tier) == 3 and len(ready) >= 3:
        user.victory = True

@router.post("/start", response_model=ShiftStartResponse)
async def start_shift(
    payload: ShiftStartRequest,
    user: User = Depends(get_current_guest),
    tab_id: str = Depends(get_tab_id),
    session: AsyncSession = Depends(get_session),
    redis: Redis = Depends(get_redis),
):
    if user.defeat or user.victory:
        raise HTTPException(status_code=400, detail={"error": {"code": "GAME_OVER", "message": "Game is already over"}})

    session_key = f"session:{user.device_id}"
    lock_key = f"lock:shift:{user.device_id}"

    # Проверка существующей сессии
    raw_session = await redis.hgetall(session_key)
    if raw_session:
        started_at = int(raw_session.get("started_at", 0))
        elapsed = int(time.time()) - started_at
        if elapsed <= GRACE_MAX_SEC:
            raise HTTPException(status_code=409, detail={"error": {"code": "SHIFT_ALREADY_ACTIVE", "message": "Shift is already active"}})

    # Валидация состава
    selected_ids = payload.selected_hostess_ids
    if not selected_ids:
        raise HTTPException(status_code=400, detail={"error": {"code": "NO_STAFF_SELECTED", "message": "No staff selected for shift"}})

    stmt = select(UserHostess).where(UserHostess.device_id == user.device_id)
    res = await session.execute(stmt)
    hostesses = list(res.scalars().all())

    server_stamina = {}
    for hid in selected_ids:
        target = next((h for h in hostesses if h.hostess_id == hid), None)
        if not target or not target.hired:
            raise HTTPException(status_code=400, detail={"error": {"code": "STAFF_UNAVAILABLE", "message": f"{hid} is not hired"}})
        if cast(int, target.stamina) < STAMINA_TIRED_MIN:
            raise HTTPException(status_code=400, detail={"error": {"code": "STAFF_UNAVAILABLE", "message": f"{hid} is in BURNOUT"}})
        server_stamina[hid] = cast(int, target.stamina)

    # Генерация shift_id и seed
    shift_id = str(uuid.uuid4())
    current_time = int(time.time())
    seed = random.randint(0, 2**31 - 1)

    initial_tables = [
        {"id": 1, "status": "COOLDOWN", "guest": None, "assigned_hostess_id": None, "remaining_sec": 0, "match_multiplier": 0.0, "current_match_feedback": None, "badge_remaining_sec": 0, "served_yen": 0},
        {"id": 2, "status": "COOLDOWN", "guest": None, "assigned_hostess_id": None, "remaining_sec": 4, "match_multiplier": 0.0, "current_match_feedback": None, "badge_remaining_sec": 0, "served_yen": 0},
        {"id": 3, "status": "COOLDOWN", "guest": None, "assigned_hostess_id": None, "remaining_sec": 8, "match_multiplier": 0.0, "current_match_feedback": None, "badge_remaining_sec": 0, "served_yen": 0},
    ]

    session_data = {
        "shift_id": shift_id,
        "started_at": current_time,
        "seed": seed,
        "tier": cast(int, user.club_tier),
        "roster": ",".join(selected_ids),
        "has_bouncer": "true" if payload.has_bouncer else "false",
        "server_stamina_json": json.dumps(server_stamina),
        "tables_json": json.dumps(initial_tables),
        "gross_income": 0,
        "vip_tips_total": 0,
        "bomzh_losses": 0,
        "served_count": 0,
        "angry_count": 0,
        "bomzh_blocked_count": 0,
        "bomzh_placated_count": 0,
        "majima_applied": "false",
        "last_action_ts": current_time,
        "actions_in_current_sec": 0,
    }

    async with redis.pipeline(transaction=True) as pipe:
        await pipe.hset(session_key, mapping=session_data)
        await pipe.expire(session_key, SESSION_TTL_SEC)
        await pipe.set(lock_key, tab_id, ex=LOCK_TTL_SEC)
        await pipe.execute()

    return ShiftStartResponse(
        shift_id=shift_id,
        started_at=current_time,
        duration_sec=SHIFT_DURATION_SEC,
        seed=seed,
        tables=[TableDTO.model_validate(t) for t in initial_tables],
    )

@router.post("/action", response_model=ShiftActionResponse)
async def shift_action(
    payload: ShiftActionRequest,
    user: User = Depends(get_current_guest),
    redis: Redis = Depends(get_redis),
):
    session_key = f"session:{user.device_id}"
    raw_session = await redis.hgetall(session_key)
    if not raw_session:
        raise HTTPException(status_code=404, detail={"error": {"code": "NO_ACTIVE_SHIFT", "message": "No active shift"}})

    if raw_session.get("shift_id") != payload.shift_id:
        raise HTTPException(status_code=400, detail={"error": {"code": "SHIFT_ID_MISMATCH", "message": "Shift ID mismatch"}})

    current_time = int(time.time())
    started_at = int(raw_session.get("started_at", 0))
    elapsed = current_time - started_at

    if elapsed > GRACE_MAX_SEC:
        raise HTTPException(status_code=400, detail={"error": {"code": "SHIFT_EXPIRED", "message": "Shift has expired"}})

    # Антифлуд (максимум 10 действий/сек)
    last_ts = int(raw_session.get("last_action_ts", 0))
    action_count = int(raw_session.get("actions_in_current_sec", 0))
    if current_time == last_ts:
        if action_count >= MAX_ACTIONS_PER_SECOND:
            raise HTTPException(status_code=429, detail={"error": {"code": "TOO_MANY_ACTIONS", "message": "Action rate limit exceeded"}})
        action_count += 1
    else:
        last_ts = current_time
        action_count = 1

    server_stamina = json.loads(raw_session.get("server_stamina_json", "{}"))
    roster_ids = [x for x in raw_session.get("roster", "").split(",") if x]

    # Маджима на 150-й секунде
    majima_applied = raw_session.get("majima_applied") == "true"
    if not majima_applied and elapsed >= MAJIMA_START_SEC:
        majima_applied = True
        for hid in roster_ids:
            server_stamina[hid] = min(STAMINA_MAX, server_stamina.get(hid, 100) + MAJIMA_STAMINA_RESTORE)

    gross_income = int(raw_session.get("gross_income", 0))
    placated_count = int(raw_session.get("bomzh_placated_count", 0))

    action = payload.action
    if action.type == "ASSIGN":
        hid = action.hostess_id
        if hid not in roster_ids:
            raise HTTPException(status_code=400, detail={"error": {"code": "STAFF_UNAVAILABLE", "message": "Hostess is not in shift roster"}})

        cost = STAMINA_DRAIN_ETIQUETTE if user.etiquette else STAMINA_DRAIN_NORMAL
        table_snap = next((t for t in payload.snapshot if t.id == action.table_id), None)
        if user.premium_bar and table_snap and table_snap.guest and table_snap.guest.type == "RICH":
            cost += STAMINA_BAR_EXTRA

        if server_stamina.get(hid, 0) < cost:
            raise HTTPException(status_code=400, detail={"error": {"code": "STAMINA_INSUFFICIENT", "message": "Hostess stamina is insufficient on server"}})

        server_stamina[hid] -= cost

    elif action.type == "PLACATE_BOMZH":
        hid = action.hostess_id
        if hid not in roster_ids:
            raise HTTPException(status_code=400, detail={"error": {"code": "STAFF_UNAVAILABLE", "message": "Hostess is not in shift roster"}})
        if server_stamina.get(hid, 0) < BOMZH_PLACATE_STAMINA_DRAIN:
            raise HTTPException(status_code=400, detail={"error": {"code": "STAMINA_INSUFFICIENT", "message": "Hostess stamina is insufficient for bomzh"}})

        server_stamina[hid] -= BOMZH_PLACATE_STAMINA_DRAIN
        placated_count += 1

    elif action.type == "GUEST_LEFT":
        gross_income += action.earned_yen

    tables_json = json.dumps([t.model_dump() for t in payload.snapshot])
    update_data = {
        "server_stamina_json": json.dumps(server_stamina),
        "tables_json": tables_json,
        "gross_income": gross_income,
        "bomzh_placated_count": placated_count,
        "majima_applied": "true" if majima_applied else "false",
        "last_action_ts": last_ts,
        "actions_in_current_sec": action_count,
    }

    async with redis.pipeline(transaction=True) as pipe:
        await pipe.hset(session_key, mapping=update_data)
        await pipe.expire(session_key, SESSION_TTL_SEC)
        await pipe.execute()

    return ShiftActionResponse(status="ok")

@router.get("/state", response_model=ShiftStateResponse)
async def get_shift_state(
    user: User = Depends(get_current_guest),
    redis: Redis = Depends(get_redis),
):
    session_key = f"session:{user.device_id}"
    raw_session = await redis.hgetall(session_key)
    if not raw_session:
        return ShiftStateResponse(is_active=False)

    current_time = int(time.time())
    started_at = int(raw_session.get("started_at", 0))
    elapsed = current_time - started_at

    if elapsed > GRACE_MAX_SEC:
        return ShiftStateResponse(is_active=False)

    time_rem = max(0, SHIFT_DURATION_SEC - elapsed)
    server_stamina = json.loads(raw_session.get("server_stamina_json", "{}"))
    tables_data = json.loads(raw_session.get("tables_json", "[]"))
    roster_ids = [x for x in raw_session.get("roster", "").split(",") if x]

    return ShiftStateResponse(
        is_active=True,
        shift_id=raw_session.get("shift_id"),
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

@router.post("/complete", response_model=ShiftCompleteResponse)
async def complete_shift(
    payload: ShiftCompleteRequest,
    user: User = Depends(get_current_guest),
    session: AsyncSession = Depends(get_session),
    redis: Redis = Depends(get_redis),
):
    shift_uuid = uuid.UUID(payload.shift_id)

    # Идемпотентность: повторный запрос с тем же shift_id
    stmt_history = select(ShiftHistory).where(ShiftHistory.shift_id == shift_uuid)
    res_hist = await session.execute(stmt_history)
    existing_shift = res_hist.scalar_one_or_none()

    stmt_host = select(UserHostess).where(UserHostess.device_id == user.device_id)
    res_host = await session.execute(stmt_host)
    hostesses = list(res_host.scalars().all())

    if existing_shift:
        report_dto = ShiftReportDTO(
            shift_id=str(existing_shift.shift_id),
            club_tier=cast(Literal[1, 2, 3], existing_shift.club_tier),
            started_at=int(existing_shift.started_at.timestamp()),
            ended_at=int(existing_shift.ended_at.timestamp()),
            guests_served=int(existing_shift.guests_served),
            guests_lost_angry=int(existing_shift.guests_angry),
            bomzh_blocked=int(existing_shift.bomzh_blocked),
            bomzh_placated=int(existing_shift.bomzh_placated),
            gross_yen=int(existing_shift.gross_yen),
            vip_tips_yen=int(existing_shift.vip_tips_yen),
            rent_yen=int(existing_shift.rent_yen),
            fot_yen=int(existing_shift.fot_yen),
            bouncer_yen=int(existing_shift.bouncer_yen),
            bomzh_loss_yen=int(existing_shift.bomzh_loss_yen),
            net_yen=int(existing_shift.net_yen),
        )
        return ShiftCompleteResponse(
            report=report_dto,
            clamped=bool(existing_shift.clamped),
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
            victory=cast(bool, user.victory),
            defeat=cast(bool, user.defeat),
        )

    session_key = f"session:{user.device_id}"
    lock_key = f"lock:shift:{user.device_id}"
    raw_session = await redis.hgetall(session_key)

    if not raw_session:
        raise HTTPException(status_code=404, detail={"error": {"code": "NO_ACTIVE_SHIFT", "message": "No active shift session"}})

    if raw_session.get("shift_id") != payload.shift_id:
        raise HTTPException(status_code=400, detail={"error": {"code": "SHIFT_ID_MISMATCH", "message": "Shift ID mismatch"}})

    current_time = int(time.time())
    started_at = int(raw_session.get("started_at", 0))
    elapsed = current_time - started_at

    if elapsed < GRACE_MIN_SEC:
        raise HTTPException(status_code=400, detail={"error": {"code": "TOO_EARLY", "message": "Shift is still in progress"}})
    if elapsed > GRACE_MAX_SEC:
        raise HTTPException(status_code=400, detail={"error": {"code": "SHIFT_EXPIRED", "message": "Shift has expired"}})

    # Санити-капы античита
    client_rep = payload.report
    gross_yen = client_rep.gross_yen
    vip_tips_yen = client_rep.vip_tips_yen
    clamped = False

    if gross_yen > MAX_ALLOWED_GROSS_YEN:
        gross_yen = MAX_ALLOWED_GROSS_YEN
        clamped = True
    if vip_tips_yen > MAX_ALLOWED_VIP_TIPS_YEN:
        vip_tips_yen = MAX_ALLOWED_VIP_TIPS_YEN
        clamped = True

    tier = int(raw_session.get("tier", 1))
    has_bouncer = raw_session.get("has_bouncer") == "true"
    roster_ids = [x for x in raw_session.get("roster", "").split(",") if x]
    placated_count = int(raw_session.get("bomzh_placated_count", 0))

    rent_cost = RENT_BY_TIER[tier]
    fot_cost = len(roster_ids) * HOSTESS_WAGE_PER_SHIFT
    bouncer_cost = BOUNCER_COST_PER_SHIFT if has_bouncer else 0
    bomzh_losses = placated_count * BOMZH_PLACATE_LOSS_YEN
    total_expenses = rent_cost + fot_cost + bouncer_cost + bomzh_losses
    net_yen = (gross_yen + vip_tips_yen) - total_expenses

    # Блокировка юзера и атомарная транзакция в Postgres
    stmt_user = select(User).where(User.device_id == user.device_id).with_for_update()
    res_user = await session.execute(stmt_user)
    locked_user = res_user.scalar_one()

    locked_user.yen = cast(int, locked_user.yen) + net_yen

    # Применяем серверную стамину + сон +20
    server_stamina = json.loads(raw_session.get("server_stamina_json", "{}"))
    for h in hostesses:
        if h.hostess_id in server_stamina:
            h.stamina = server_stamina[h.hostess_id]
        if h.hired:
            h.stamina = min(STAMINA_MAX, cast(int, h.stamina) + SLEEP_STAMINA_RESTORE)

    _recalculate_flags(locked_user, hostesses)

    history = ShiftHistory(
        shift_id=shift_uuid,
        device_id=locked_user.device_id,
        club_tier=tier,
        started_at=datetime.fromtimestamp(started_at, tz=timezone.utc),
        ended_at=datetime.fromtimestamp(started_at + SHIFT_DURATION_SEC, tz=timezone.utc),
        guests_served=client_rep.guests_served,
        guests_angry=client_rep.guests_lost_angry,
        bomzh_blocked=client_rep.bomzh_blocked,
        bomzh_placated=placated_count,
        gross_yen=gross_yen,
        vip_tips_yen=vip_tips_yen,
        rent_yen=rent_cost,
        fot_yen=fot_cost,
        bouncer_yen=bouncer_cost,
        bomzh_loss_yen=bomzh_losses,
        net_yen=net_yen,
        clamped=clamped,
    )

    try:
        session.add(history)
        await session.commit()
        await session.refresh(locked_user)
    except IntegrityError:
        await session.rollback()
        stmt_hist = select(ShiftHistory).where(ShiftHistory.shift_id == shift_uuid)
        history = (await session.execute(stmt_hist)).scalar_one()
        await session.refresh(locked_user)

    # Очистка сессии в Redis
    await redis.delete(session_key, lock_key)

    report_out = ShiftReportDTO(
        shift_id=str(shift_uuid),
        club_tier=cast(Literal[1, 2, 3], tier),
        started_at=started_at,
        ended_at=started_at + SHIFT_DURATION_SEC,
        guests_served=int(history.guests_served),
        guests_lost_angry=int(history.guests_angry),
        bomzh_blocked=int(history.bomzh_blocked),
        bomzh_placated=int(history.bomzh_placated),
        gross_yen=gross_yen,
        vip_tips_yen=vip_tips_yen,
        rent_yen=rent_cost,
        fot_yen=fot_cost,
        bouncer_yen=bouncer_cost,
        bomzh_loss_yen=bomzh_losses,
        net_yen=net_yen,
    )

    return ShiftCompleteResponse(
        report=report_out,
        clamped=clamped,
        player=PlayerDTO(
            yen=cast(int, locked_user.yen),
            club_tier=cast(Literal[1, 2, 3], locked_user.club_tier),
            victory=cast(bool, locked_user.victory),
            defeat=cast(bool, locked_user.defeat),
        ),
        hostesses=[
            HostessStateDTO(
                id=cast(Literal["YUKI", "MIRA", "SAKURA", "NIKA", "LUNA"], h.hostess_id),
                hired=cast(bool, h.hired),
                stamina=cast(int, h.stamina),
            )
            for h in sorted(hostesses, key=lambda x: str(x.hostess_id))
        ],
        victory=cast(bool, locked_user.victory),
        defeat=cast(bool, locked_user.defeat),
    )
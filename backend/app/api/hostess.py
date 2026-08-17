import time
from typing import Literal, cast
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from redis.asyncio import Redis

from app.core.db import get_session
from app.core.redis import get_redis
from app.core.security import get_current_guest
from app.models.user import User
from app.models.hostess import UserHostess
from app.schemas.hostess import (
    HostessHireRequest,
    HostessRecoverRequest,
    HostessMutationResponse,
)
from app.schemas.game import PlayerDTO, HostessStateDTO
from app.core.balance import (
    HOSTESS_HIRE_COSTS,
    SPA_COST,
    SPA_STAMINA_RESTORE,
    VIP_VACATION_COST,
    STAMINA_MAX,
    ORPHAN_TIMEOUT_SEC,
    STAMINA_TIRED_MIN,
    STAMINA_READY_MIN,
    ZERO_STAFF_BANKRUPTCY_THRESHOLD_YEN,
)

router = APIRouter(prefix="/api/hostess", tags=["Hostess"])

async def _is_shift_active(redis: Redis, device_id) -> bool:
    raw = await redis.hgetall(f"session:{device_id}")
    if not raw:
        return False
    started_at = int(raw.get("started_at", 0))
    return (int(time.time()) - started_at) <= ORPHAN_TIMEOUT_SEC

def _recalculate_flags(user: User, hostesses: list[UserHostess]) -> None:
    if user.yen < 0:
        user.defeat = True

    available = [h for h in hostesses if h.hired and cast(int, h.stamina) >= STAMINA_TIRED_MIN]
    if len(available) == 0 and user.yen < ZERO_STAFF_BANKRUPTCY_THRESHOLD_YEN:
        user.defeat = True

    ready = [h for h in hostesses if h.hired and cast(int, h.stamina) >= STAMINA_READY_MIN]
    if user.club_tier == 3 and len(ready) >= 3:
        user.victory = True

def _build_mutation_response(user: User, hostesses: list[UserHostess]) -> HostessMutationResponse:
    return HostessMutationResponse(
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
    )

@router.post("/hire", response_model=HostessMutationResponse)
async def hire_hostess(
    payload: HostessHireRequest,
    user: User = Depends(get_current_guest),
    session: AsyncSession = Depends(get_session),
    redis: Redis = Depends(get_redis),
):
    if user.defeat:
        raise HTTPException(status_code=400, detail={"error": {"code": "GAME_OVER", "message": "Game is over"}})

    if await _is_shift_active(redis, user.device_id):
        raise HTTPException(status_code=409, detail={"error": {"code": "SHIFT_ALREADY_ACTIVE", "message": "Cannot hire staff during an active shift"}})

    cost = HOSTESS_HIRE_COSTS.get(payload.hostess_id)
    if cost is None:
        raise HTTPException(status_code=422, detail={"error": {"code": "VALIDATION", "message": "Unknown hostess id"}})

    stmt_user = select(User).where(User.device_id == user.device_id).with_for_update()
    res_user = await session.execute(stmt_user)
    locked_user = res_user.scalar_one()

    stmt = select(UserHostess).where(UserHostess.device_id == locked_user.device_id).with_for_update()
    result = await session.execute(stmt)
    hostesses = list(result.scalars().all())

    target = next((h for h in hostesses if h.hostess_id == payload.hostess_id), None)
    if not target:
        raise HTTPException(status_code=422, detail={"error": {"code": "VALIDATION", "message": "Hostess not found"}})
    if target.hired:
        raise HTTPException(status_code=400, detail={"error": {"code": "ALREADY_HIRED", "message": "Hostess is already hired"}})
    if locked_user.yen < cost:
        raise HTTPException(status_code=400, detail={"error": {"code": "INSUFFICIENT_FUNDS", "message": "Not enough yen"}})

    locked_user.yen -= cost
    target.hired = True
    _recalculate_flags(locked_user, hostesses)

    await session.commit()
    await session.refresh(locked_user)
    return _build_mutation_response(locked_user, hostesses)

@router.post("/recover", response_model=HostessMutationResponse)
async def recover_hostess(
    payload: HostessRecoverRequest,
    user: User = Depends(get_current_guest),
    session: AsyncSession = Depends(get_session),
    redis: Redis = Depends(get_redis),
):
    if user.defeat:
        raise HTTPException(status_code=400, detail={"error": {"code": "GAME_OVER", "message": "Game is over"}})

    if await _is_shift_active(redis, user.device_id):
        raise HTTPException(status_code=409, detail={"error": {"code": "SHIFT_ALREADY_ACTIVE", "message": "Cannot recover staff during an active shift"}})

    stmt_user = select(User).where(User.device_id == user.device_id).with_for_update()
    res_user = await session.execute(stmt_user)
    locked_user = res_user.scalar_one()

    stmt = select(UserHostess).where(UserHostess.device_id == locked_user.device_id).with_for_update()
    result = await session.execute(stmt)
    hostesses = list(result.scalars().all())

    target = next((h for h in hostesses if h.hostess_id == payload.hostess_id), None)
    if not target or not target.hired:
        raise HTTPException(status_code=422, detail={"error": {"code": "VALIDATION", "message": "Hostess is not hired"}})
    if target.stamina >= STAMINA_MAX:
        raise HTTPException(status_code=400, detail={"error": {"code": "ALREADY_FULL", "message": "Stamina is already at maximum"}})

    cost = VIP_VACATION_COST if payload.method == "VIP_VACATION" else SPA_COST
    if locked_user.yen < cost:
        raise HTTPException(status_code=400, detail={"error": {"code": "INSUFFICIENT_FUNDS", "message": "Not enough yen"}})

    locked_user.yen -= cost
    if payload.method == "VIP_VACATION":
        target.stamina = STAMINA_MAX
    else:
        target.stamina = min(STAMINA_MAX, target.stamina + SPA_STAMINA_RESTORE)

    _recalculate_flags(locked_user, hostesses)

    await session.commit()
    await session.refresh(locked_user)
    return _build_mutation_response(locked_user, hostesses)
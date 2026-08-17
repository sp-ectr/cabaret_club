import re
import uuid
from fastapi import Header, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.core.db import get_session
from app.models.user import User
from app.models.hostess import UserHostess
from app.core.balance import STARTING_YEN

# Строгий lowercase UUIDv4 по RFC 4122
UUID4_REGEX = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"
)

def validate_uuid4(val: str) -> uuid.UUID:
    if not val or not UUID4_REGEX.match(val):
        raise HTTPException(
            status_code=401,
            detail={"error": {"code": "INVALID_GUEST_ID", "message": "X-Guest-ID must be a valid lowercase UUIDv4"}}
        )
    return uuid.UUID(val)

async def get_current_guest(
    x_guest_id: str = Header(..., alias="X-Guest-ID"),
    session: AsyncSession = Depends(get_session)
) -> User:
    guest_uuid = validate_uuid4(x_guest_id)

    stmt = select(User).where(User.device_id == guest_uuid)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        try:
            user = User(
                device_id=guest_uuid,
                yen=STARTING_YEN,
                club_tier=1
            )
            session.add(user)
            await session.flush()

            starter_hostesses = [
                UserHostess(device_id=guest_uuid, hostess_id="YUKI", hired=True, stamina=100),
                UserHostess(device_id=guest_uuid, hostess_id="MIRA", hired=True, stamina=100),
                UserHostess(device_id=guest_uuid, hostess_id="SAKURA", hired=True, stamina=100),
                UserHostess(device_id=guest_uuid, hostess_id="NIKA", hired=False, stamina=100),
                UserHostess(device_id=guest_uuid, hostess_id="LUNA", hired=False, stamina=100),
            ]
            session.add_all(starter_hostesses)
            await session.commit()
            await session.refresh(user)

        except IntegrityError:
            await session.rollback()
            stmt = select(User).where(User.device_id == guest_uuid)
            result = await session.execute(stmt)
            user = result.scalar_one_or_none()
            if not user:
                raise HTTPException(status_code=500, detail="User creation race condition anomaly")

    return user

def get_tab_id(x_tab_id: str = Header(..., alias="X-Tab-ID")) -> str:
    if not x_tab_id:
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "MISSING_TAB_ID", "message": "X-Tab-ID header is required"}}
        )
    return x_tab_id
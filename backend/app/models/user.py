import uuid
from datetime import datetime
from sqlalchemy import BigInteger, SmallInteger, Boolean, DateTime, Uuid, CheckConstraint, text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base

class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("club_tier IN (1, 2, 3)", name="check_club_tier_range"),
    )

    device_id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True)
    yen: Mapped[int] = mapped_column(BigInteger, default=60000, server_default=text("60000"))
    club_tier: Mapped[int] = mapped_column(SmallInteger, default=1, server_default=text("1"))

    vip_interior: Mapped[bool] = mapped_column(Boolean, default=False, server_default=text("false"))
    premium_bar: Mapped[bool] = mapped_column(Boolean, default=False, server_default=text("false"))
    neon_sign: Mapped[bool] = mapped_column(Boolean, default=False, server_default=text("false"))
    etiquette: Mapped[bool] = mapped_column(Boolean, default=False, server_default=text("false"))

    victory: Mapped[bool] = mapped_column(Boolean, default=False, server_default=text("false"))
    defeat: Mapped[bool] = mapped_column(Boolean, default=False, server_default=text("false"))

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    hostesses: Mapped[list["UserHostess"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    shifts: Mapped[list["ShiftHistory"]] = relationship(back_populates="user", cascade="all, delete-orphan")
import uuid
from datetime import datetime
from sqlalchemy import BigInteger, SmallInteger, Boolean, DateTime, ForeignKey, Uuid, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base

class ShiftHistory(Base):
    __tablename__ = "shift_history"

    shift_id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True)
    device_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("users.device_id", ondelete="CASCADE"),
        index=True
    )
    club_tier: Mapped[int] = mapped_column(SmallInteger)

    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    ended_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    guests_served: Mapped[int] = mapped_column(SmallInteger)
    guests_angry: Mapped[int] = mapped_column(SmallInteger)
    bomzh_blocked: Mapped[int] = mapped_column(SmallInteger)
    bomzh_placated: Mapped[int] = mapped_column(SmallInteger)

    gross_yen: Mapped[int] = mapped_column(BigInteger)
    vip_tips_yen: Mapped[int] = mapped_column(BigInteger)
    rent_yen: Mapped[int] = mapped_column(BigInteger)
    fot_yen: Mapped[int] = mapped_column(BigInteger)
    bouncer_yen: Mapped[int] = mapped_column(BigInteger)
    bomzh_loss_yen: Mapped[int] = mapped_column(BigInteger)
    net_yen: Mapped[int] = mapped_column(BigInteger)
    clamped: Mapped[bool] = mapped_column(Boolean, default=False, server_default=text("false"))

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="shifts")
import uuid
from sqlalchemy import String, SmallInteger, Boolean, ForeignKey, Uuid, CheckConstraint, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base

class UserHostess(Base):
    __tablename__ = "user_hostesses"
    __table_args__ = (
        CheckConstraint(
            "hostess_id IN ('YUKI', 'MIRA', 'SAKURA', 'NIKA', 'LUNA')",
            name="check_valid_hostess_id"
        ),
        CheckConstraint("stamina BETWEEN 0 AND 100", name="check_stamina_range"),
    )

    device_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("users.device_id", ondelete="CASCADE"),
        primary_key=True
    )
    hostess_id: Mapped[str] = mapped_column(String(8), primary_key=True)
    hired: Mapped[bool] = mapped_column(Boolean, default=False, server_default=text("false"))
    stamina: Mapped[int] = mapped_column(SmallInteger, default=100, server_default=text("100"))

    user: Mapped["User"] = relationship(back_populates="hostesses")
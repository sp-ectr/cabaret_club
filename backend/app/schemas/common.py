from typing import Literal
from pydantic import BaseModel

# Базовые литералы
ClubTierType = Literal[1, 2, 3]
HostessIdType = Literal["YUKI", "MIRA", "SAKURA", "NIKA", "LUNA"]
StatType = Literal["talk", "charisma", "service"]
GuestType = Literal["POOR", "MID", "RICH", "BOMZH"]
TableStatus = Literal["WAITING", "SERVING", "BOMZH_BLOCKED", "COOLDOWN"]
MatchFeedback = Literal["PERFECT", "GOOD", "POOR"]
GuestLeaveReason = Literal["SERVED", "ANGRY_LEAVE", "BOMZH_GONE"]

class ErrorDetail(BaseModel):
    code: str
    message: str

class ErrorResponse(BaseModel):
    error: ErrorDetail

class PlayerDTO(BaseModel):
    yen: int
    club_tier: ClubTierType
    victory: bool
    defeat: bool

class HostessStateDTO(BaseModel):
    id: HostessIdType
    hired: bool
    stamina: int

class UpgradesDTO(BaseModel):
    vip_interior: bool
    premium_bar: bool
    neon_sign: bool
    etiquette: bool
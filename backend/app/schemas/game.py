from typing import Literal
from pydantic import BaseModel
from app.schemas.shift import ShiftStateResponse, ShiftReportDTO

ClubTierType = Literal[1, 2, 3]
HostessIdType = Literal["YUKI", "MIRA", "SAKURA", "NIKA", "LUNA"]

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

class GameInitResponse(BaseModel):
    player: PlayerDTO
    hostesses: list[HostessStateDTO]
    upgrades: UpgradesDTO
    server_time: int
    active_shift: ShiftStateResponse | None = None
    auto_closed_shift: ShiftReportDTO | None = None
from typing import Literal
from pydantic import BaseModel

class PlayerDTO(BaseModel):
    yen: int
    club_tier: Literal[1, 2, 3]
    victory: bool
    defeat: bool

class HostessStateDTO(BaseModel):
    id: Literal["YUKI", "MIRA", "SAKURA", "NIKA", "LUNA"]
    hired: bool
    stamina: int

class UpgradesDTO(BaseModel):
    vip_interior: bool
    premium_bar: bool
    neon_sign: bool
    etiquette: bool
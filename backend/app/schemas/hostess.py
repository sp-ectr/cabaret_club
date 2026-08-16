from typing import Literal
from pydantic import BaseModel
from app.schemas.game import PlayerDTO, HostessStateDTO

class HostessHireRequest(BaseModel):
    hostess_id: Literal["NIKA", "LUNA"]

class HostessRecoverRequest(BaseModel):
    hostess_id: Literal["YUKI", "MIRA", "SAKURA", "NIKA", "LUNA"]
    method: Literal["SPA", "VIP_VACATION"]

class HostessMutationResponse(BaseModel):
    player: PlayerDTO
    hostesses: list[HostessStateDTO]
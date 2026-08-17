from typing import Literal
from pydantic import BaseModel
from app.schemas.common import PlayerDTO, HostessStateDTO, HostessIdType

class HostessHireRequest(BaseModel):
    hostess_id: Literal["NIKA", "LUNA"]

class HostessRecoverRequest(BaseModel):
    hostess_id: HostessIdType
    method: Literal["SPA", "VIP_VACATION"]

class HostessMutationResponse(BaseModel):
    player: PlayerDTO
    hostesses: list[HostessStateDTO]
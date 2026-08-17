from pydantic import BaseModel
from app.schemas.common import PlayerDTO, HostessStateDTO, UpgradesDTO, ClubTierType, HostessIdType
from app.schemas.shift import ShiftStateResponse, ShiftReportDTO

class GameInitResponse(BaseModel):
    player: PlayerDTO
    hostesses: list[HostessStateDTO]
    upgrades: UpgradesDTO
    server_time: int
    active_shift: ShiftStateResponse | None = None
    auto_closed_shift: ShiftReportDTO | None = None
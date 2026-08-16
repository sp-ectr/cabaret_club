from app.schemas.common import ErrorResponse, ErrorDetail
from app.schemas.game import PlayerDTO, HostessStateDTO, UpgradesDTO
from app.schemas.shift import (
    GuestDTO,
    TableDTO,
    ShiftStartRequest,
    ShiftStartResponse,
    ShiftActionRequest,
    ShiftActionResponse,
    ShiftStateResponse,
    ShiftReportDTO,
    ShiftCompleteRequest,
    ShiftCompleteResponse,
    GameInitResponse,
)
from app.schemas.hostess import HostessHireRequest, HostessRecoverRequest, HostessMutationResponse
from app.schemas.shop import ShopBuyRequest, ShopBuyResponse, ClubUpgradeResponse

__all__ = [
    "ErrorResponse",
    "ErrorDetail",
    "PlayerDTO",
    "HostessStateDTO",
    "UpgradesDTO",
    "GuestDTO",
    "TableDTO",
    "ShiftStartRequest",
    "ShiftStartResponse",
    "ShiftActionRequest",
    "ShiftActionResponse",
    "ShiftStateResponse",
    "ShiftReportDTO",
    "ShiftCompleteRequest",
    "ShiftCompleteResponse",
    "GameInitResponse",
    "HostessHireRequest",
    "HostessRecoverRequest",
    "HostessMutationResponse",
    "ShopBuyRequest",
    "ShopBuyResponse",
    "ClubUpgradeResponse",
]
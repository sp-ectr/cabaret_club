from typing import Literal, Annotated, Union
from pydantic import BaseModel, Field
from app.schemas.game import PlayerDTO, HostessStateDTO, UpgradesDTO

StatType = Literal["talk", "charisma", "service"]
GuestType = Literal["POOR", "MID", "RICH", "BOMZH"]
TableStatus = Literal["WAITING", "SERVING", "BOMZH_BLOCKED", "COOLDOWN"]
MatchFeedback = Literal["PERFECT", "GOOD", "POOR"]
GuestLeaveReason = Literal["SERVED", "ANGRY_LEAVE", "BOMZH_GONE"]

class GuestDTO(BaseModel):
    id: str
    type: GuestType
    visible_stats: list[StatType] | None = None
    hidden_weights: dict[str, float] | None = None
    avatar_key: int
    patience_sec: int

class TableDTO(BaseModel):
    id: Literal[1, 2, 3]
    status: TableStatus
    guest: GuestDTO | None = None
    assigned_hostess_id: str | None = None
    remaining_sec: int
    match_multiplier: float
    current_match_feedback: MatchFeedback | None = None
    badge_remaining_sec: int = 0
    served_yen: int = 0

class ShiftStartRequest(BaseModel):
    selected_hostess_ids: list[Literal["YUKI", "MIRA", "SAKURA", "NIKA", "LUNA"]]
    has_bouncer: bool = False

class ShiftStartResponse(BaseModel):
    shift_id: str
    started_at: int
    duration_sec: int
    seed: int
    tables: list[TableDTO]

# Дискриминированные действия
class GuestSpawnedAction(BaseModel):
    type: Literal["GUEST_SPAWNED"] = "GUEST_SPAWNED"
    table_id: Literal[1, 2, 3]
    guest: GuestDTO

class AssignAction(BaseModel):
    type: Literal["ASSIGN"] = "ASSIGN"
    table_id: Literal[1, 2, 3]
    hostess_id: Literal["YUKI", "MIRA", "SAKURA", "NIKA", "LUNA"]
    match_multiplier: float
    feedback: MatchFeedback

class PlacateBomzhAction(BaseModel):
    type: Literal["PLACATE_BOMZH"] = "PLACATE_BOMZH"
    table_id: Literal[1, 2, 3]
    hostess_id: Literal["YUKI", "MIRA", "SAKURA", "NIKA", "LUNA"]

class GuestLeftAction(BaseModel):
    type: Literal["GUEST_LEFT"] = "GUEST_LEFT"
    table_id: Literal[1, 2, 3]
    reason: GuestLeaveReason
    earned_yen: int

ShiftActionPayload = Annotated[
    Union[GuestSpawnedAction, AssignAction, PlacateBomzhAction, GuestLeftAction],
    Field(discriminator="type")
]

class ShiftActionRequest(BaseModel):
    shift_id: str
    action: ShiftActionPayload
    snapshot: list[TableDTO]

class ShiftActionResponse(BaseModel):
    status: str = "ok"

class ShiftStateResponse(BaseModel):
    is_active: bool
    shift_id: str | None = None
    started_at: int | None = None
    time_remaining: int | None = None
    seed: int | None = None
    tier: int | None = None
    roster: list[HostessStateDTO] | None = None
    has_bouncer: bool | None = None
    tables: list[TableDTO] | None = None
    gross_income: int | None = None

class ShiftReportDTO(BaseModel):
    shift_id: str
    club_tier: Literal[1, 2, 3]
    started_at: int
    ended_at: int
    guests_served: int
    guests_lost_angry: int
    bomzh_blocked: int
    bomzh_placated: int
    gross_yen: int
    vip_tips_yen: int
    rent_yen: int
    fot_yen: int
    bouncer_yen: int
    bomzh_loss_yen: int
    net_yen: int

class ShiftCompleteRequest(BaseModel):
    shift_id: str
    report: ShiftReportDTO

class ShiftCompleteResponse(BaseModel):
    report: ShiftReportDTO
    clamped: bool
    player: PlayerDTO
    hostesses: list[HostessStateDTO]
    victory: bool
    defeat: bool

class GameInitResponse(BaseModel):
    player: PlayerDTO
    hostesses: list[HostessStateDTO]
    upgrades: UpgradesDTO
    server_time: int
    active_shift: ShiftStateResponse | None = None
    auto_closed_shift: ShiftReportDTO | None = None
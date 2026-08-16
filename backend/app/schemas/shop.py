from typing import Literal
from pydantic import BaseModel
from app.schemas.game import PlayerDTO, UpgradesDTO

class ShopBuyRequest(BaseModel):
    upgrade_id: Literal["VIP_INTERIOR", "PREMIUM_BAR", "NEON_SIGN", "ETIQUETTE"]

class ShopBuyResponse(BaseModel):
    player: PlayerDTO
    upgrades: UpgradesDTO

class ClubUpgradeResponse(BaseModel):
    player: PlayerDTO
    victory: bool
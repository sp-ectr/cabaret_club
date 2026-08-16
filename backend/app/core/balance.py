"""
Единый источник констант баланса для бэкенда.
Строго по docs/MANIFEST.md и docs/API.md.
"""

# Тайминги смены (§4)
SHIFT_DURATION_SEC = 300
GRACE_MIN_SEC = 285
GRACE_MAX_SEC = 330
ORPHAN_TIMEOUT_SEC = 330

# Стартовый капитал (§1)
STARTING_YEN = 60_000

# Аренда зала по уровню клуба (§9)
RENT_BY_TIER = {
    1: 120_000,
    2: 250_000,
    3: 400_000,
}

# ФОТ персонала (§2, §9)
HOSTESS_WAGE_PER_SHIFT = 20_000

# Цены и штрафы бомжа (§7)
BOUNCER_COST_PER_SHIFT = 70_000
BOMZH_PLACATE_LOSS_YEN = 15_000
BOMZH_PLACATE_STAMINA_DRAIN = 25

# Цены улучшений (§8)
UPGRADE_COSTS = {
    "VIP_INTERIOR": 250_000,
    "PREMIUM_BAR": 150_000,
    "NEON_SIGN": 80_000,
    "ETIQUETTE": 100_000,
}

# Цены перехода на уровень клуба (§1)
TIER_UPGRADE_COSTS = {
    2: 350_000,
    3: 800_000,
}

# Найм хостес (§2)
HOSTESS_HIRE_COSTS = {
    "NIKA": 120_000,
    "LUNA": 300_000,
}

# СПА и восстановление (§6)
SPA_COST = 30_000
SPA_STAMINA_RESTORE = 30
VIP_VACATION_COST = 70_000
SLEEP_STAMINA_RESTORE = 20

# Стамина и статусы (§6)
STAMINA_MAX = 100
STAMINA_READY_MIN = 60
STAMINA_TIRED_MIN = 25
STAMINA_DRAIN_NORMAL = 15
STAMINA_DRAIN_ETIQUETTE = 10
STAMINA_BAR_EXTRA = 2

# События (§7)
MAJIMA_START_SEC = 150
MAJIMA_STAMINA_RESTORE = 20

# Redis TTL и антифлуд (§4 API.md)
SESSION_TTL_SEC = 600
LOCK_TTL_SEC = 300
MAX_ACTIONS_PER_SECOND = 10

# Софтлок-банкротство (§12)
ZERO_STAFF_BANKRUPTCY_THRESHOLD_YEN = 30_000

# Санити-капы античита (§3.5 API.md)
MAX_ALLOWED_GROSS_YEN = 8_200_000
MAX_ALLOWED_VIP_TIPS_YEN = 1_200_000
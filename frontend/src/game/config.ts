// src/game/config.ts
// Все константные данные баланса. Строго по docs/MANIFEST.md — параграфы в комментариях.
// Здесь только данные: ни функций, ни вычислений.

import type { ClubTier, GuestType, Hostess, UpgradeId } from "./types";

// 4. Тайминги смены и столов ---------------------------

/** Длительность смены секунды (4: ровно 300) */
export const SHIFT_DURATION_SEC = 300;

/** Шахматный старт столов: стол №1 — 0с, №2 — 4с, №3 — 8с (4) */
export const TABLE_STAGGER_SEC = [0, 4, 8] as const;

/** Обслуживание гостя, секунды (4: 30) */
export const SERVING_SEC = 30;

/** Базовая пауза стола после ухода гостя, секунды (4: 10) */
export const BASE_COOLDOWN_SEC = 10;

/** Пауза стола с «Неоновой вывеской», секунды (4, 8: 4) */
export const NEON_COOLDOWN_SEC = 4;

/** Терпение гостя в WAITING, секунды (4: 10) */
export const PATIENCE_SEC = 10;

/** Блокировка стола бомжом бездействия, секунды (4, 7: 60) */
export const BOMZH_BLOCK_SEC = 60;

/** После подсадки хостес бомж уходит не дольше чем за, секунды (7: min(остаток, 30)) */
export const BOMZH_PLACATE_SEC = 30;

// 1. Капитал, звёзды, аренда --------------------

/** Стартовый капитал (1: ¥60,000 - «крещение» без страховки) */
export const STARTING_YEN = 60_000;

/** Цена перехода на следующий уровень клуба (1: ★★ ¥350,000; ★★★ ¥800,000) */
export const TIER_UPGRADE_COSTS: Record<Exclude<ClubTier, 1>, number> = {
  2: 350_000,
  3: 800_000,
};

/** Аренда зала за смену по уровню клуба (9) */
export const RENT_BY_TIER: Record<ClubTier, number> = {
  1: 120_000,
  2: 250_000,
  3: 400_000,
};

/** Порог софтлок-банкротства: 0 дееспособных при балансе ниже этой суммы (12) */
export const ZERO_STAFF_BANKRUPTCY_THRESHOLD_YEN = 30_000;

// 3. Гости: тарифы и вероятности ----------------------------------

/** Базовая ставка гостя, ¥/сек (§3). У BOMZH дохода нет. */
export const GUEST_RATES: Record<GuestType, number> = {
  POOR: 300,
  MID: 800,
  RICH: 2200,
  BOMZH: 0,
};

/** Доли спавна по классам на каждом уровне клуба (§3; сумма = 1) */
export const SPAWN_RATES_BY_TIER: Record<ClubTier, Record<GuestType, number>> = {
  1: { POOR: 0.5, MID: 0.3, RICH: 0.1, BOMZH: 0.1 },
  2: { POOR: 0.25, MID: 0.45, RICH: 0.2, BOMZH: 0.1 },
  3: { POOR: 0.1, MID: 0.35, RICH: 0.45, BOMZH: 0.1 },
};

// 5. Формула обслуживания ---------------------------

/** Веса предпочтений гостя (5): главная / вторая / скрытая */
export const MATCH_WEIGHT_PRIMARY = 1.5;
export const MATCH_WEIGHT_SECONDARY = 1.0;
export const MATCH_WEIGHT_HIDDEN = 0.5;

/** Пороги бейджей (5): M >= 1.7 — PERFECT; M >= 1.0 — GOOD; ниже — POOR */
export const MATCH_PERFECT_MIN = 1.7;
export const MATCH_GOOD_MIN = 1.0;

/** Штраф усталости: TIRED хостес (5, 6) */
export const TIRED_MULTIPLIER = 0.8;

// 6. Задор: списания и восстановление ------------------------------

/** Максимальный и стартовый задор хостес (6) */
export const STAMINA_MAX = 100;

/** Списание за обычного гостя / с «Курсами этикета» (6) */
export const STAMINA_DRAIN_NORMAL = 15;
export const STAMINA_DRAIN_ETIQUETTE = 10;

/** Доплата богача под «Премиальным Баром» (6, 8) */
export const STAMINA_BAR_EXTRA = 2;

/** Подсадка к бомжу (6, 7) */
export const BOMZH_PLACATE_STAMINA_DRAIN = 25;

/** Пороги статусов после смены (6): READY >= 60, TIRED >= 25, ниже — BURNOUT */
export const STAMINA_READY_MIN = 60;
export const STAMINA_TIRED_MIN = 25;

/** Бесплатный сон после смены (6: +20 всем) */
export const SLEEP_STAMINA_RESTORE = 20;

/** СПА / Релакс (6: +30 за ¥30,000, многократно, работает на BURNOUT) */
export const SPA_COST = 30_000;
export const SPA_RESTORE = 30;

/** VIP-Отпуск (6: полное восстановление до 100 за ¥70,000) */
export const VIP_VACATION_COST = 70_000;

// 2. Ростер: зарплата и найм ------------------------------

/** ЗП за смену: за каждую хостес в составе, независимо от посадок (2) */
export const HOSTESS_WAGE_PER_SHIFT = 20_000;

/** Конфиг хостес: доменные поля + цена найма (null — стартовая) */
export interface HostessConfig extends Hostess {
  hireCost: number | null;
}

/** Стартовый ростер (§2): циклические специалисты 90/35/10 */
export const INITIAL_HOSTESSES: HostessConfig[] = [
  { id: "YUKI", name: "Yuki", rarity: "SSR", stats: { talk: 90, charisma: 35, service: 10 }, stamina: 100, hired: true, hireCost: null },
  { id: "MIRA", name: "Mira", rarity: "SR", stats: { talk: 10, charisma: 90, service: 35 }, stamina: 100, hired: true, hireCost: null },
  { id: "SAKURA", name: "Sakura", rarity: "SR", stats: { talk: 35, charisma: 10, service: 90 }, stamina: 100, hired: true, hireCost: null },
  { id: "NIKA", name: "Nika", rarity: "R", stats: { talk: 50, charisma: 50, service: 50 }, stamina: 100, hired: false, hireCost: 120_000 },
  { id: "LUNA", name: "Luna", rarity: "SSR", stats: { talk: 85, charisma: 85, service: 85 }, stamina: 100, hired: false, hireCost: 300_000 },
];

// 7. События смены ------------------

/** «Визит Шейха» (7): аура стола №1 с 30-й секунды на 15 секунд */
export const SHEIKH_TABLE_ID = 1 as const;
export const SHEIKH_START_SEC = 30;
export const SHEIKH_DURATION_SEC = 15;
/** Аддитивно после M, не перемножается ни с M, ни с баром (7) */
export const SHEIKH_BONUS_YEN_PER_SEC = 1500;

/** «Мадзима принёс арбуз / Baka Mitai» (7): на 150-й секунде, +20 задора работающим */
export const MAJIMA_START_SEC = 150;
export const MAJIMA_STAMINA_RESTORE = 20;

/** Подсадка к бомжу: мгновенный убыток клуба (7) */
export const BOMZH_PLACATE_LOSS_YEN = 15_000;

// 8. Пять улучшений клуба -------------------------------

export interface UpgradeConfig {
  /** Цена покупки, ¥ */
  cost: number;
  /** true — действует одну смену и сгорает (вышибала); false — перманентно */
  perShift: boolean;
  /** Минимальный уровень клуба для покупки */
  minTier: ClubTier;
  /** Класс улучшения — для UI-бейджа (§8) */
  kind: "SECURITY" | "REWARD" | "ECONOMY" | "THROUGHPUT" | "STAFFING";
}

/**
 * Эффекты улучшений выражаются остальными константами конфига:
 * BOUNCER — шанс бомжа в SPAWN_RATES_BY_TIER обнуляется;
 * VIP_INTERIOR — VIP_TIP_YEN при VIP_TIP_MATCH_MIN на богачах;
 * PREMIUM_BAR — ставка богача ×2, задор +STAMINA_BAR_EXTRA;
 * NEON_SIGN — COOLDOWN: BASE_COOLDOWN_SEC → NEON_COOLDOWN_SEC;
 * ETIQUETTE — расход задора: NORMAL → ETIQUETTE.
 */
export const UPGRADE_CONFIGS: Record<UpgradeId, UpgradeConfig> = {
  BOUNCER: { cost: 70_000, perShift: true, minTier: 1, kind: "SECURITY" },
  VIP_INTERIOR: { cost: 250_000, perShift: false, minTier: 2, kind: "REWARD" },
  PREMIUM_BAR: { cost: 150_000, perShift: false, minTier: 1, kind: "ECONOMY" },
  NEON_SIGN: { cost: 80_000, perShift: false, minTier: 1, kind: "THROUGHPUT" },
  ETIQUETTE: { cost: 100_000, perShift: false, minTier: 1, kind: "STAFFING" },
};

/** VIP Tip: награда за богача при M >= порога (8) */
export const VIP_TIP_YEN = 50_000;
export const VIP_TIP_MATCH_MIN = 1.7;

/** Множитель ставки богача под «Премиальным Баром» (8: чек ×2) */
export const RICH_RATE_BAR_MULTIPLIER = 2;

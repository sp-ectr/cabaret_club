// src/game/types.ts
// Доменные типы игры. Строго по docs/MANIFEST.md - параграфы указаны в комментариях.
// Здесь только типы: константы баланса живут в config.ts, логика — в economy.ts / shiftEngine.ts.

// 5. Характеристики и предпочтения --------------------------

/** Три характеристики хостес / предпочтения гостей (5) */
export type StatType = "talk" | "charisma" | "service";

/** Статы хостес, шкала 0..100 (2) */
export interface HostessStats {
  talk: number;
  charisma: number;
  service: number;
}

/**
 * Скрытая раскладка весов предпочтений гостя (5): ровно одна характеристика
 * весит 1.5, одна 1.0, одна 0.5. Движок считает M по этой раскладке; UI её не показывает.
 */
export type PreferenceWeights = Record<StatType, 1.5 | 1.0 | 0.5>;

//2. Ростер хостес -------------------------------

export type HostessId = "YUKI" | "MIRA" | "SAKURA" | "NIKA" | "LUNA";

export type HostessRarity = "SSR" | "SR" | "R";

/**
 * Статус по остатку задора после смены (6):
 * READY >= 60, TIRED 25–59, BURNOUT < 25. Выводится функцией, не хранится.
 */
export type HostessStatus = "READY" | "TIRED" | "BURNOUT";

export interface Hostess {
  id: HostessId;
  name: string;
  rarity: HostessRarity;
  stats: HostessStats;
  /** Текущий задор, 0..100 (6) */
  stamina: number;
  /** Стартовые трое — true; NIKA и LUNA открываются наймом (2) */
  hired: boolean;
}

// 3. Гости -----------------------------------

/** Голяк / Средняк / Богач / Бомж-диверсия (3) */
export type GuestType = "POOR" | "MID" | "RICH" | "BOMZH";

export interface Guest {
  id: string;
  type: GuestType;
  /** Два видимых предпочтения (5), порядок отображения перемешан. Для BOMZH — null. */
  visibleStats: [StatType, StatType] | null;
  /** Скрытые веса (5). Для BOMZH — null: его не обслуживают, а успокаивают (7). */
  hiddenWeights: PreferenceWeights | null;
  /** Аватар гостя - индекс картинки 1..3 внутри класса; у бомжа одна картинка: 1 */
  avatarKey: 1 | 2 | 3;
  /** Терпение в секундах в состоянии WAITING (4: ровно 10). Для BOMZH не используется. */
  patienceSec: number; // 10 сек по умолчанию
}

// 4. Столы -------------------------------

export type TableStatus = "WAITING" | "SERVING" | "BOMZH_BLOCKED" | "COOLDOWN";

/** Пороги бейджа (5): M >= 1.7 — PERFECT; 1.0 <= M < 1.7 — GOOD; M < 1.0 — POOR */
export type MatchFeedback = "PERFECT" | "GOOD" | "POOR";

export interface GameTable {
  id: 1 | 2 | 3;
  status: TableStatus;
  /** Текущий гость за столом; null в COOLDOWN */
  guest: Guest | null;
  /** Назначенная хостес. Назначение финально (4); null, пока гость WAITING или стол пуст */
  assignedHostessId: HostessId | null;
  /** Секунды, оставшиеся в текущем статусе: терпение / обслуживание / блокировка / пауза (4) */
  remainingSec: number;
  /** Финальный M текущего обслуживания с учётом штрафа TIRED × 0.8 (5); 0 вне SERVING */
  matchMultiplier: number;
  /** Бейдж последней посадки, живёт ~1.5 с, затем сбрасывается в null (5) */
  currentMatchFeedback: MatchFeedback | null;
  /** Заработано столом за смену — посекундный стриминг (4) */
  servedYen: number;
}

// ==================== 8. Улучшения, 1. Звёзды ====================

export type UpgradeId = "BOUNCER" | "VIP_INTERIOR" | "PREMIUM_BAR" | "NEON_SIGN" | "ETIQUETTE";

/** Уровень клуба: ★1 → ★★2 → ★★★3 (§1) */
export type ClubTier = 1 | 2 | 3;

// 9. Финансовый отчёт смены ---------------------

/**
 * Инвариант (9):
 * netYen = grossYen + vipTipsYen − rentYen − fotYen − bouncerYen − bomzhLossYen
 */
export interface ShiftReport {
  shiftId: string;
  clubTier: ClubTier;
  /** Unix-секунды, серверное время */
  startedAt: number;
  endedAt: number;
  /** Завершённые обслуживания */
  guestsServed: number;
  /** Уходы по истечении терпения (ANGRY_LEAVE, 4) */
  guestsLostAngry: number;
  /** Спавны бомжа (7) */
  bomzhBlocked: number;
  /** Успокоенные бомжи (7) */
  bomzhPlacated: number;
  /** Выручка с заказов, включая бонус ауры Шейха (7, 9) */
  grossYen: number;
  /** VIP Tips: +¥50,000 за богача при M >= 1.7 с VIP-Интерьером (8) */
  vipTipsYen: number;
  /** Аренда по уровню клуба (9) */
  rentYen: number;
  /** ФОТ: состав смены × ¥20,000 (2) */
  fotYen: number;
  /** Нанятый на смену вышибала (8); 0, если не нанимали */
  bouncerYen: number;
  /** Суммарные штрафы подсадки бомжей, −¥15,000 за случай (7) */
  bomzhLossYen: number;
  /** Чистая прибыль смены (9) */
  netYen: number;
}

// 10. Экшены синхронизации (Action-Driven REST Sync) ---------------------------

export type ShiftActionType = "GUEST_SPAWNED" | "ASSIGN" | "PLACATE_BOMZH" | "GUEST_LEFT";

/** SERVED — обслуживание завершено; ANGRY_LEAVE — терпение истекло; BOMZH_GONE — бомж ушёл (таймаут или успокоен) */
export type GuestLeaveReason = "SERVED" | "ANGRY_LEAVE" | "BOMZH_GONE";

/** Дискриминированное объединение событий стола для POST /api/shift/action (§10) */
export type ShiftAction =
  | { type: "GUEST_SPAWNED"; tableId: 1 | 2 | 3; guest: Guest }
  | { type: "ASSIGN"; tableId: 1 | 2 | 3; hostessId: HostessId; matchMultiplier: number; feedback: MatchFeedback }
  | { type: "PLACATE_BOMZH"; tableId: 1 | 2 | 3; hostessId: HostessId }
  | { type: "GUEST_LEFT"; tableId: 1 | 2 | 3; reason: GuestLeaveReason; earnedYen: number };

/** Тело запроса POST /api/shift/action: действие + идемпотентный снапшот столов (10) */
export interface ShiftActionEnvelope {
  shiftId: string;
  action: ShiftAction;
  snapshot: GameTable[];
}

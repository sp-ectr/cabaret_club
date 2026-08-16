// src/game/economy.ts
// Чистая математика экономики по docs/MANIFEST.md. Без состояния и побочных эффектов.

import {
  BOMZH_PLACATE_LOSS_YEN,
  HOSTESS_WAGE_PER_SHIFT,
  MATCH_GOOD_MIN,
  MATCH_PERFECT_MIN,
  RENT_BY_TIER,
  STAMINA_READY_MIN,
  STAMINA_TIRED_MIN,
  TIRED_MULTIPLIER,
  UPGRADE_CONFIGS,
  ZERO_STAFF_BANKRUPTCY_THRESHOLD_YEN,
} from "./config";
import type {
  ClubTier,
  Hostess,
  HostessStats,
  HostessStatus,
  MatchFeedback,
  PreferenceWeights,
  ShiftReport,
  StatType,
} from "./types";

const STAT_KEYS: StatType[] = ["talk", "charisma", "service"];

/** Округление до 2 знаков */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Множитель удовлетворения (5): M = (1.5·S₁ + 1.0·S₂ + 0.5·S₃) / 100.
 * Штраф TIRED (×0.8) применяется до округления, итог округляется до 2 знаков.
 */
export function calcMatchMultiplier(
  stats: HostessStats,
  hiddenWeights: PreferenceWeights,
  isTired: boolean
): number {
  let raw = 0;
  for (const key of STAT_KEYS) {
    raw += hiddenWeights[key] * stats[key];
  }
  raw /= 100;
  if (isTired) {
    raw *= TIRED_MULTIPLIER;
  }
  return round2(raw);
}

/** Бейдж подбора (5): M >= 1.7 — PERFECT; M >= 1.0 — GOOD; иначе POOR */
export function getMatchFeedback(multiplier: number): MatchFeedback {
  if (multiplier >= MATCH_PERFECT_MIN) return "PERFECT";
  if (multiplier >= MATCH_GOOD_MIN) return "GOOD";
  return "POOR";
}

/** Статус хостес по остатку задора (6): >= 60 READY; 25–59 TIRED; < 25 BURNOUT */
export function getHostessStatus(stamina: number): HostessStatus {
  if (stamina >= STAMINA_READY_MIN) return "READY";
  if (stamina >= STAMINA_TIRED_MIN) return "TIRED";
  return "BURNOUT";
}

export interface CalcShiftReportParams {
  shiftId: string;
  clubTier: ClubTier;
  /** Unix-секунды, серверное время */
  startedAt: number;
  endedAt: number;
  guestsServed: number;
  guestsLostAngry: number;
  bomzhBlocked: number;
  bomzhPlacated: number;
  /** Выручка с заказов (стриминг + аура Шейха) */
  grossYen: number;
  vipTipsYen: number;
  /** Сколько хостес выбрано в состав смены */
  rosterSize: number;
  hasBouncer: boolean;
}

/**
 * Финансовый отчёт смены (§9):
 * net = gross + vipTips − аренда − ФОТ − вышибала − убытки бомжей.
 * Все слагаемые берутся из config.ts.
 */
export function calcShiftReport(params: CalcShiftReportParams): ShiftReport {
  const rentYen = RENT_BY_TIER[params.clubTier];
  const fotYen = params.rosterSize * HOSTESS_WAGE_PER_SHIFT;
  const bouncerYen = params.hasBouncer ? UPGRADE_CONFIGS.BOUNCER.cost : 0;
  const bomzhLossYen = params.bomzhPlacated * BOMZH_PLACATE_LOSS_YEN;
  const netYen =
    params.grossYen +
    params.vipTipsYen -
    rentYen -
    fotYen -
    bouncerYen -
    bomzhLossYen;

  return { ...params, rentYen, fotYen, bouncerYen, bomzhLossYen, netYen };
}

export interface ZeroStaffCheck {
  /** true — «Клуб закрыт»: персонала нет, но деньги на СПА есть (12) */
  isBlocked: boolean;
  /** true — поражение: персонала нет и денег меньше ¥30,000 (12) */
  isBankrupt: boolean;
}

/** Нанятые хостес, способные выйти на смену (READY или TIRED, 6) */
function countAvailable(hostesses: Hostess[]): number {
  return hostesses.filter(
    (h) => h.hired && getHostessStatus(h.stamina) !== "BURNOUT"
  ).length;
}

/**
 * Правило Zero-Staff (12). Исходы взаимоисключающие:
 * isBankrupt — экран поражения; isBlocked — экран восстановления (аренда не капает).
 */
export function checkZeroStaff(hostesses: Hostess[], yen: number): ZeroStaffCheck {
  const available = countAvailable(hostesses);
  if (available > 0) {
    return { isBlocked: false, isBankrupt: false };
  }
  if (yen < ZERO_STAFF_BANKRUPTCY_THRESHOLD_YEN) {
    return { isBlocked: false, isBankrupt: true };
  }
  return { isBlocked: true, isBankrupt: false };
}

/** Победа (12): клуб ★★★ и минимум 3 нанятые хостес в статусе READY */
export function checkVictory(tier: ClubTier, hostesses: Hostess[]): boolean {
  if (tier !== 3) return false;
  const readyCount = hostesses.filter(
    (h) => h.hired && getHostessStatus(h.stamina) === "READY"
  ).length;
  return readyCount >= 3;
}

// src/game/__tests__/economy.test.ts
// Проверка математики манифеста: 5 (M и бейджи), 6 (статусы), 9 (отчёт), 12 (Zero-Staff, победа).

import { describe, expect, it } from "vitest";
import {
  calcMatchMultiplier,
  calcShiftReport,
  checkVictory,
  checkZeroStaff,
  getHostessStatus,
  getMatchFeedback,
} from "../economy";
import { INITIAL_HOSTESSES } from "../config";
import type { Hostess, HostessId, PreferenceWeights } from "../types";

// ---------- Хелперы ----------

const getHostess = (id: HostessId): Hostess => {
  const found = INITIAL_HOSTESSES.find((h) => h.id === id);
  if (!found) throw new Error(`нет хостес ${id}`);
  return found;
};

const setStamina = (id: HostessId, stamina: number): Hostess => ({
  ...getHostess(id),
  stamina,
});

type Weight = 1.5 | 1.0 | 0.5;
const weights = (talk: Weight, charisma: Weight, service: Weight): PreferenceWeights => ({
  talk,
  charisma,
  service,
});

const YUKI = getHostess("YUKI").stats; // 90 / 35 / 10
const NIKA = getHostess("NIKA").stats; // 50 / 50 / 50
const LUNA = getHostess("LUNA").stats; // 85 / 85 / 85

// 5. calcMatchMultiplier ----------

describe("calcMatchMultiplier: перестановки YUKI (§5)", () => {
  it("идеальный подбор - топ-стат в весе 1.5: M = 1.75", () => {
    expect(calcMatchMultiplier(YUKI, weights(1.5, 1.0, 0.5), false)).toBe(1.75);
  });

  it("хороший подбор - топ-стат в весе 1.0: M = 1.48 (точное 1.475, округление вверх)", () => {
    expect(calcMatchMultiplier(YUKI, weights(1.0, 1.5, 0.5), false)).toBe(1.48);
  });

  it("ошибочный подбор - топ-стат в весе 0.5: M = 0.95", () => {
    expect(calcMatchMultiplier(YUKI, weights(0.5, 1.0, 1.5), false)).toBe(0.95);
  });

  it("все 6 перестановок весов дают значения из диапазона манифеста", () => {
    const cases: Array<[PreferenceWeights, number]> = [
      [weights(1.5, 1.0, 0.5), 1.75], // 135 + 35 + 5   = 175
      [weights(1.5, 0.5, 1.0), 1.63], // 135 + 17.5 + 10 = 162.5
      [weights(1.0, 1.5, 0.5), 1.48], // 90 + 52.5 + 5   = 147.5 → 1.475 → 1.48
      [weights(1.0, 0.5, 1.5), 1.23], // 90 + 17.5 + 15  = 122.5
      [weights(0.5, 1.5, 1.0), 1.08], // 45 + 52.5 + 10  = 107.5
      [weights(0.5, 1.0, 1.5), 0.95], // 45 + 35 + 15    = 95
    ];
    for (const [w, expected] of cases) {
      expect(calcMatchMultiplier(YUKI, w, false)).toBe(expected);
    }
  });
});

describe("calcMatchMultiplier: спец-ростер (§2)", () => {
  it("NIKA 50/50/50 - всегда 1.50 при любой раскладке", () => {
    expect(calcMatchMultiplier(NIKA, weights(1.5, 1.0, 0.5), false)).toBe(1.5);
    expect(calcMatchMultiplier(NIKA, weights(0.5, 1.5, 1.0), false)).toBe(1.5);
    expect(calcMatchMultiplier(NIKA, weights(1.0, 0.5, 1.5), false)).toBe(1.5);
  });

  it("LUNA 85/85/85 - всегда 2.55 при любой раскладке", () => {
    expect(calcMatchMultiplier(LUNA, weights(1.5, 1.0, 0.5), false)).toBe(2.55);
    expect(calcMatchMultiplier(LUNA, weights(0.5, 1.0, 1.5), false)).toBe(2.55);
  });
});

describe("calcMatchMultiplier: штраф TIRED × 0.8 (§5)", () => {
  it("1.75 × 0.8 = 1.40", () => {
    expect(calcMatchMultiplier(YUKI, weights(1.5, 1.0, 0.5), true)).toBe(1.4);
  });

  it("0.95 × 0.8 = 0.76", () => {
    expect(calcMatchMultiplier(YUKI, weights(0.5, 1.0, 1.5), true)).toBe(0.76);
  });
});

// 5. getMatchFeedback ----------

describe("getMatchFeedback: пороги бейджей (§5)", () => {
  it("M >= 1.7 — PERFECT (включая границу)", () => {
    expect(getMatchFeedback(1.7)).toBe("PERFECT");
    expect(getMatchFeedback(1.75)).toBe("PERFECT");
    expect(getMatchFeedback(2.55)).toBe("PERFECT");
  });

  it("1.0 <= M < 1.7 — GOOD", () => {
    expect(getMatchFeedback(1.69)).toBe("GOOD");
    expect(getMatchFeedback(1.47)).toBe("GOOD");
    expect(getMatchFeedback(1.0)).toBe("GOOD");
  });

  it("M < 1.0 — POOR", () => {
    expect(getMatchFeedback(0.99)).toBe("POOR");
    expect(getMatchFeedback(0.95)).toBe("POOR");
    expect(getMatchFeedback(0.76)).toBe("POOR");
  });
});

// 6. getHostessStatus ----------

describe("getHostessStatus: пороги задора (§6)", () => {
  it.each([
    [100, "READY"],
    [60, "READY"], // граница >= 60
    [59, "TIRED"],
    [25, "TIRED"], // граница >= 25
    [24, "BURNOUT"],
    [0, "BURNOUT"],
  ] as const)("задор %i → %s", (stamina, expected) => {
    expect(getHostessStatus(stamina)).toBe(expected);
  });
});

// 9. calcShiftReport ----------

describe("calcShiftReport: формула чистой прибыли (§9)", () => {
  it("первая смена из манифеста: 452K выручки на ★1 с тремя хостес → +272K", () => {
    const report = calcShiftReport({
      shiftId: "test-1",
      clubTier: 1,
      startedAt: 1_000,
      endedAt: 1_300,
      guestsServed: 19,
      guestsLostAngry: 0,
      bomzhBlocked: 2,
      bomzhPlacated: 0,
      grossYen: 452_000,
      vipTipsYen: 0,
      rosterSize: 3,
      hasBouncer: false,
    });
    expect(report.rentYen).toBe(120_000);
    expect(report.fotYen).toBe(60_000);
    expect(report.bouncerYen).toBe(0);
    expect(report.bomzhLossYen).toBe(0);
    expect(report.netYen).toBe(272_000);
  });

  it("со всеми расходами: вышибала, 2 подсадки бомжа, VIP-типы (§9)", () => {
    const report = calcShiftReport({
      shiftId: "test-2",
      clubTier: 1,
      startedAt: 1_000,
      endedAt: 1_300,
      guestsServed: 20,
      guestsLostAngry: 1,
      bomzhBlocked: 2,
      bomzhPlacated: 2,
      grossYen: 500_000,
      vipTipsYen: 50_000,
      rosterSize: 3,
      hasBouncer: true,
    });
    // 500K + 50K − 120K − 60K − 70K − 30K = 270K
    expect(report.netYen).toBe(270_000);
    expect(report.bomzhLossYen).toBe(30_000);
    expect(report.bouncerYen).toBe(70_000);
  });

  it("убыточная смена может уйти в минус (баланс < 0 → банкротство, §12)", () => {
    const report = calcShiftReport({
      shiftId: "test-3",
      clubTier: 3,
      startedAt: 1_000,
      endedAt: 1_300,
      guestsServed: 2,
      guestsLostAngry: 10,
      bomzhBlocked: 3,
      bomzhPlacated: 0,
      grossYen: 50_000,
      vipTipsYen: 0,
      rosterSize: 3,
      hasBouncer: false,
    });
    // 50K − 400K − 60K = −410K
    expect(report.netYen).toBe(-410_000);
  });
});

// 12. checkZeroStaff ----------

describe("checkZeroStaff: правило Zero-Staff (§12)", () => {
  it("есть READY/TIRED персонал — играем дальше", () => {
    const roster = [setStamina("YUKI", 100), setStamina("MIRA", 40), setStamina("SAKURA", 10)];
    expect(checkZeroStaff(roster, 10_000)).toEqual({ isBlocked: false, isBankrupt: false });
  });

  it("весь нанятый персонал в BURNOUT, денег >= ¥30,000 — клуб закрыт на восстановление", () => {
    const roster = [setStamina("YUKI", 10), setStamina("MIRA", 0), setStamina("SAKURA", 24)];
    expect(checkZeroStaff(roster, 30_000)).toEqual({ isBlocked: true, isBankrupt: false });
  });

  it("BURNOUT у всех и денег < ¥30,000 — банкротство", () => {
    const roster = [setStamina("YUKI", 10), setStamina("MIRA", 0), setStamina("SAKURA", 24)];
    expect(checkZeroStaff(roster, 29_999)).toEqual({ isBlocked: false, isBankrupt: true });
  });

  it("найм не спасает: ненанятая LUNA со 100 задора не считается доступной (§2, §12)", () => {
    const roster = [
      setStamina("YUKI", 10),
      setStamina("MIRA", 0),
      setStamina("SAKURA", 20),
      setStamina("LUNA", 100), // hired: false
    ];
    expect(checkZeroStaff(roster, 100_000)).toEqual({ isBlocked: true, isBankrupt: false });
  });
});

// 12. checkVictory ----------

describe("checkVictory: условия победы (§12)", () => {
  it("★★★ и три READY — победа", () => {
    const roster = [setStamina("YUKI", 100), setStamina("MIRA", 60), setStamina("SAKURA", 90)];
    expect(checkVictory(3, roster)).toBe(true);
  });

  it("★★★, но READY только две — победы нет", () => {
    const roster = [setStamina("YUKI", 100), setStamina("MIRA", 60), setStamina("SAKURA", 40)];
    expect(checkVictory(3, roster)).toBe(false);
  });

  it("три READY, но клуб ★★ — победы нет: звёзды обязательны", () => {
    const roster = [setStamina("YUKI", 100), setStamina("MIRA", 60), setStamina("SAKURA", 90)];
    expect(checkVictory(2, roster)).toBe(false);
  });
});

// src/game/__tests__/shiftEngine.test.ts
// Проверки движка смены: полный прогон на сиде, события, экшены, отчёт.

import { describe, expect, it } from "vitest";
import {
  applyAssign,
  applyPlacateBomzh,
  createInitialShiftState,
  finalizeShift,
  isHostessBusy,
  shiftTick,
  type ShiftContext,
  type ShiftEngineState,
} from "../shiftEngine";
import { createRNG } from "../rng";
import { INITIAL_HOSTESSES } from "../config";
import type { GameTable, Guest, Hostess, PreferenceWeights } from "../types";

// ---------- Хелперы ----------

const baseCtx: ShiftContext = {
  tier: 1,
  hasBouncer: false,
  hasNeonSign: false,
  hasVipInterior: false,
  hasPremiumBar: false,
  hasEtiquette: false,
};

const startRoster = (): Hostess[] =>
  INITIAL_HOSTESSES.filter((h) => h.hired).map((h) => ({ ...h }));

// Полный прогон смены с ботом: каждую секунду сажает случайную свободную хостес
// к ждущему госту - средний уровень игры, как расчёт M ~ 1.30 в манифесте
function runFullShift(ctx: ShiftContext, seed: number): ShiftEngineState {
  let state = createInitialShiftState(ctx, startRoster());
  const spawnRng = createRNG(seed);
  const pickRng = createRNG(777);
  let guard = 0;
  while (state.timeRemainingSec > 0 && guard++ < 1000) {
    state = shiftTick(state, spawnRng);
    for (const table of state.tables) {
      if (table.status !== "WAITING" || !table.guest || table.guest.type === "BOMZH") continue;
      const free = state.activeHostesses.filter(
        (h) => !isHostessBusy(state, h.id) && h.stamina >= 15
      );
      if (free.length === 0) continue;
      const pick = free[Math.floor(pickRng() * free.length)];
      const res = applyAssign(state, table.id, pick.id);
      if (res.ok) state = res.state;
    }
  }
  expect(guard).toBeLessThan(1000); // смена не должна зацикливаться
  return state;
}

const payingGuests = (s: ShiftEngineState) => s.servedCount + s.angryCount;

// Ручной гость для точечных сценариев
function makeGuest(type: Guest["type"], weights: PreferenceWeights): Guest {
  return {
    id: "guest-test",
    type,
    visibleStats: ["talk", "charisma"],
    hiddenWeights: weights,
    avatarKey: 1,
    patienceSec: 10,
  };
}

// Подмена стола в состоянии (для точечных тестов)
function withTable(
  state: ShiftEngineState,
  tableId: 1 | 2 | 3,
  patch: Partial<GameTable>
): ShiftEngineState {
  return {
    ...state,
    tables: state.tables.map((t) => (t.id === tableId ? { ...t, ...patch } : t)),
  };
}

// ---------- 1. Полный прогон ----------

describe("полный 300-секундный прогон на сиде", () => {
  // Набор сидов для среднего прогона: выручка одной смены - случайная величина
  // (разброс 240-670K из-за бомжей, микса гостей и M), манифестовские 452K -
  // это матожидание. Проверяем среднее по 12 сидам.
  const CALIBRATION_SEEDS = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 2024];

  const average = (nums: number[]) => nums.reduce((a, b) => a + b, 0) / nums.length;

  it("звезда 1: среднее по 12 сидам сходится с манифестом (~20 заходов, ~452K)", () => {
    const runs = CALIBRATION_SEEDS.map((seed) => runFullShift(baseCtx, seed));
    const arrivals = average(runs.map((s) => s.servedCount + s.angryCount + s.bomzhBlockedCount));
    const bomzh = average(runs.map((s) => s.bomzhBlockedCount));
    const gross = average(runs.map((s) => s.grossIncome));

    // вместимость ~20 гостей суммарно (раздел 4): платящие + бомжи
    expect(arrivals).toBeGreaterThanOrEqual(18);
    expect(arrivals).toBeLessThanOrEqual(23);
    // бомжей в среднем 2-3 при шансе 10%
    expect(bomzh).toBeGreaterThanOrEqual(1.5);
    expect(bomzh).toBeLessThanOrEqual(4);
    // средняя выручка вокруг расчётных 452K при среднем подборе M ~ 1.30
    expect(gross).toBeGreaterThanOrEqual(420_000);
    expect(gross).toBeLessThanOrEqual(520_000);
  });

  it("один и тот же сид даёт одинаковый результат до йены (детерминизм)", () => {
    const a = runFullShift(baseCtx, 55);
    const b = runFullShift(baseCtx, 55);
    expect(a.grossIncome).toBe(b.grossIncome);
    expect(a.servedCount).toBe(b.servedCount);
    expect(a.tables.map((t) => t.servedYen)).toEqual(b.tables.map((t) => t.servedYen));
  });

  it("неоновая вывеска: вместимость растёт примерно до 24 гостей", () => {
    const plain = runFullShift(baseCtx, 2024);
    const neon = runFullShift({ ...baseCtx, hasNeonSign: true }, 2024);
    expect(payingGuests(neon)).toBeGreaterThanOrEqual(payingGuests(plain) + 2);
  });

  it("отчёт сходится с формулой 9 и не врёт по полям", () => {
    const final = runFullShift(baseCtx, 2024);
    const report = finalizeShift(final);
    expect(report.guestsServed).toBe(final.servedCount);
    expect(report.guestsLostAngry).toBe(final.angryCount);
    expect(report.rentYen).toBe(120_000);
    expect(report.fotYen).toBe(60_000);
    expect(report.netYen).toBe(
      final.grossIncome + final.vipTipsTotal - 120_000 - 60_000 - 0 - final.bomzhLosses
    );
  });
});

// ---------- 2. События по времени ----------

describe("события на 30-й и 150-й секунде (7)", () => {
  function runTicks(ticks: number): ShiftEngineState {
    let state = createInitialShiftState(baseCtx, startRoster());
    const rng = createRNG(1);
    for (let i = 0; i < ticks; i++) state = shiftTick(state, rng);
    return state;
  }

  it("Шейх срабатывает ровно на 30-й секунде, не раньше", () => {
    expect(runTicks(29).eventsTriggered.sheikh).toBe(false);
    const t30 = runTicks(30);
    expect(t30.eventsTriggered.sheikh).toBe(true);
    expect(t30.sheikhAuraRemainingSec).toBe(14); // 15 секунд ауры, 1 уже утекла
  });

  it("Мадзима срабатывает ровно на 150-й секунде", () => {
    expect(runTicks(149).eventsTriggered.majima).toBe(false);
    expect(runTicks(150).eventsTriggered.majima).toBe(true);
  });

  it("Мадзима качает задор и не поднимает выше 100", () => {
    const roster = startRoster().map((h) => ({ ...h, stamina: 90 }));
    let state = createInitialShiftState(baseCtx, roster);
    const rng = createRNG(1);
    for (let i = 0; i < 150; i++) state = shiftTick(state, rng);
    expect(state.eventsTriggered.majima).toBe(true);
    for (const h of state.activeHostesses) expect(h.stamina).toBe(100);
  });
});

// ---------- 3. Стриминг и аура Шейха ----------

describe("посекундный стриминг и аура Шейха", () => {
  it("аура даёт +1500/с столу 1 ровно 15 секунд, аддитивно после M", () => {
    // стол 1 всю смену обслуживает богача с M = 1.0 (без подбора)
    let state = createInitialShiftState(baseCtx, startRoster());
    state = withTable(state, 1, {
      status: "SERVING",
      guest: makeGuest("RICH", { talk: 1.0, charisma: 1.5, service: 0.5 }),
      assignedHostessId: "YUKI",
      remainingSec: 60,
      matchMultiplier: 1.0,
    });
    const rng = createRNG(1);
    for (let i = 0; i < 45; i++) state = shiftTick(state, rng);

    // 45 секунд по 2200 + 15 тиков ауры (30..44) по 1500
    expect(state.grossIncome).toBe(45 * 2200 + 15 * 1500);
  });
});

// ---------- 4. Терпение ----------

describe("терпение гостя (4)", () => {
  it("10 секунд без назначения - гость уходит злым", () => {
    let state = createInitialShiftState(baseCtx, startRoster());
    state = withTable(state, 2, {
      status: "WAITING",
      guest: makeGuest("MID", { talk: 1.5, charisma: 1.0, service: 0.5 }),
      remainingSec: 10,
    });
    const rng = createRNG(1);
    for (let i = 0; i < 10; i++) state = shiftTick(state, rng);

    expect(state.angryCount).toBe(1);
    expect(state.tables[1].status).toBe("COOLDOWN");
    expect(state.tables[1].guest).toBeNull();
    expect(state.grossIncome).toBe(0);
  });
});

// ---------- 5. applyAssign ----------

describe("applyAssign (5, 6)", () => {
  function waitingState(): ShiftEngineState {
    const state = createInitialShiftState(baseCtx, startRoster());
    return withTable(state, 1, {
      status: "WAITING",
      guest: makeGuest("RICH", { talk: 1.5, charisma: 1.0, service: 0.5 }), // YUKI: M = 1.75
      remainingSec: 10,
    });
  }

  it("успешная посадка: M, бейдж PERFECT, списание 15 задора", () => {
    const res = applyAssign(waitingState(), 1, "YUKI");
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const table = res.state.tables[0];
    expect(table.status).toBe("SERVING");
    expect(table.matchMultiplier).toBe(1.75);
    expect(table.currentMatchFeedback).toBe("PERFECT");
    expect(table.badgeRemainingSec).toBe(2);
    const yuki = res.state.activeHostesses.find((h) => h.id === "YUKI")!;
    expect(yuki.stamina).toBe(85);
  });

  it("бейдж гаснет через 2 тика", () => {
    const res = applyAssign(waitingState(), 1, "YUKI");
    if (!res.ok) throw new Error(res.error);
    let state = res.state;
    const rng = createRNG(1);
    state = shiftTick(state, rng);
    state = shiftTick(state, rng);
    expect(state.tables[0].currentMatchFeedback).toBeNull();
  });

  it("TIRED хостес садится с M x 0.8", () => {
    const roster = startRoster().map((h) => (h.id === "YUKI" ? { ...h, stamina: 40 } : h));
    let state = createInitialShiftState(baseCtx, roster);
    state = withTable(state, 1, {
      status: "WAITING",
      guest: makeGuest("RICH", { talk: 1.5, charisma: 1.0, service: 0.5 }),
      remainingSec: 10,
    });
    const res = applyAssign(state, 1, "YUKI");
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.state.tables[0].matchMultiplier).toBe(1.4); // 1.75 x 0.8
  });

  it("отказ при нехватке задора", () => {
    const roster = startRoster().map((h) => (h.id === "YUKI" ? { ...h, stamina: 10 } : h));
    let state = createInitialShiftState(baseCtx, roster);
    state = withTable(state, 1, {
      status: "WAITING",
      guest: makeGuest("RICH", { talk: 1.5, charisma: 1.0, service: 0.5 }),
      remainingSec: 10,
    });
    const res = applyAssign(state, 1, "YUKI");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toContain("задора");
  });

  it("отказ, если хостес уже занята другим столом", () => {
    let state = waitingState();
    state = withTable(state, 2, {
      status: "SERVING",
      guest: makeGuest("MID", { talk: 1.5, charisma: 1.0, service: 0.5 }),
      assignedHostessId: "YUKI",
      remainingSec: 20,
      matchMultiplier: 1.5,
    });
    const res = applyAssign(state, 1, "YUKI");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toContain("занята");
  });
});

// ---------- 6. applyPlacateBomzh ----------

describe("applyPlacateBomzh (7)", () => {
  function bomzhState(remaining: number): ShiftEngineState {
    const state = createInitialShiftState(baseCtx, startRoster());
    return withTable(state, 3, {
      status: "BOMZH_BLOCKED",
      guest: makeGuest("BOMZH", { talk: 1.0, charisma: 1.0, service: 1.0 }),
      remainingSec: remaining,
    });
  }

  it("обрезает 60 до 30, списывает 15000 и 25 задора", () => {
    const res = applyPlacateBomzh(bomzhState(60), 3, "MIRA");
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.state.tables[2].remainingSec).toBe(30);
    expect(res.state.bomzhLosses).toBe(15_000);
    expect(res.state.bomzhPlacatedCount).toBe(1);
    const mira = res.state.activeHostesses.find((h) => h.id === "MIRA")!;
    expect(mira.stamina).toBe(75);
    expect(res.state.tables[2].assignedHostessId).toBe("MIRA");
  });

  it("поздняя подсадка не продлевает срок: min(20, 30) = 20", () => {
    const res = applyPlacateBomzh(bomzhState(20), 3, "MIRA");
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.state.tables[2].remainingSec).toBe(20);
  });

  it("двойная подсадка запрещена", () => {
    const first = applyPlacateBomzh(bomzhState(60), 3, "MIRA");
    if (!first.ok) throw new Error(first.error);
    const second = applyPlacateBomzh(first.state, 3, "SAKURA");
    expect(second.ok).toBe(false);
  });

  it("отказ при нехватке задора (порог 25)", () => {
    const roster = startRoster().map((h) => (h.id === "MIRA" ? { ...h, stamina: 24 } : h));
    let state = createInitialShiftState(baseCtx, roster);
    state = withTable(state, 3, {
      status: "BOMZH_BLOCKED",
      guest: makeGuest("BOMZH", { talk: 1.0, charisma: 1.0, service: 1.0 }),
      remainingSec: 60,
    });
    const res = applyPlacateBomzh(state, 3, "MIRA");
    expect(res.ok).toBe(false);
  });
});

// ---------- 7. VIP Tip ----------

describe("VIP Tip за идеального богача (8)", () => {
  it("M 1.75 + VIP-интерьер = +50000, выручка с аурой на 30-м тике", () => {
    const ctx: ShiftContext = { ...baseCtx, hasVipInterior: true };
    let state = createInitialShiftState(ctx, startRoster());
    state = withTable(state, 1, {
      status: "WAITING",
      guest: makeGuest("RICH", { talk: 1.5, charisma: 1.0, service: 0.5 }),
      remainingSec: 10,
    });
    const res = applyAssign(state, 1, "YUKI"); // PERFECT 1.75
    if (!res.ok) throw new Error(res.error);
    state = res.state;
    const rng = createRNG(1);
    for (let i = 0; i < 30; i++) state = shiftTick(state, rng);

    expect(state.servedCount).toBe(1);
    expect(state.vipTipsTotal).toBe(50_000);
    // 30 x floor(2200 x 1.75) = 30 x 3850 = 115500, аура захватила последний тик: +1500
    expect(state.grossIncome).toBe(117_000);
  });
});

// src/game/__tests__/spawner.test.ts
// Проверки генератора гостей: распределения на сиде, вышибала, инварианты (3, 5).

import { describe, expect, it } from "vitest";
import { generateGuest } from "../spawner";
import { createRNG } from "../rng";
import type { ClubTier, GuestType, StatType } from "../types";

const RUNS = 10_000;
const TOLERANCE = 0.02; // ±2%

function countTypes(tier: ClubTier, hasBouncer: boolean, seed: number): Record<GuestType, number> {
  const rng = createRNG(seed);
  const counts: Record<GuestType, number> = { POOR: 0, MID: 0, RICH: 0, BOMZH: 0 };
  for (let i = 0; i < RUNS; i++) {
    counts[generateGuest(tier, hasBouncer, rng).type]++;
  }
  return counts;
}

// 1. Распределения по звёздам ----------

describe("распределение классов на фиксированном сиде (10 000 спавнов)", () => {
  const cases: Array<[ClubTier, Record<GuestType, number>]> = [
    [1, { POOR: 0.5, MID: 0.3, RICH: 0.1, BOMZH: 0.1 }],
    [2, { POOR: 0.25, MID: 0.45, RICH: 0.2, BOMZH: 0.1 }],
    [3, { POOR: 0.1, MID: 0.35, RICH: 0.45, BOMZH: 0.1 }],
  ];

  it.each(cases)("звезда %i: доли классов в пределах ±2%%", (tier, expected) => {
    const counts = countTypes(tier, false, 42);
    for (const type of Object.keys(expected) as GuestType[]) {
      const share = counts[type] / RUNS;
      expect(Math.abs(share - expected[type])).toBeLessThanOrEqual(TOLERANCE);
    }
  });

  it("один и тот же сид даёт одинаковую последовательность гостей", () => {
    const a = createRNG(777);
    const b = createRNG(777);
    for (let i = 0; i < 100; i++) {
      expect(generateGuest(1, false, a).type).toBe(generateGuest(1, false, b).type);
    }
  });
});

// 2. Вышибала ----------

describe("вышибала блокирует бомжа (7)", () => {
  it("10 000 спавнов с вышибалой - ровно 0 бомжей", () => {
    const counts = countTypes(1, true, 42);
    expect(counts.BOMZH).toBe(0);
  });

  it("подмена на 1 звезде: доля бомжа уходит в голяков (60/30/10)", () => {
    const counts = countTypes(1, true, 42);
    const shares = {
      POOR: counts.POOR / RUNS,
      MID: counts.MID / RUNS,
      RICH: counts.RICH / RUNS,
    };
    expect(Math.abs(shares.POOR - 0.6)).toBeLessThanOrEqual(TOLERANCE);
    expect(Math.abs(shares.MID - 0.3)).toBeLessThanOrEqual(TOLERANCE);
    expect(Math.abs(shares.RICH - 0.1)).toBeLessThanOrEqual(TOLERANCE);
  });
});

// 3. Инварианты гостя ----------

describe("инварианты гостя", () => {
  it("у платных гостей ровно 2 разных видимых стата, скрытый не светится", () => {
    const rng = createRNG(1234);
    let paying = 0;
    for (let i = 0; i < 1_000; i++) {
      const guest = generateGuest(2, false, rng);
      if (guest.type === "BOMZH") continue;
      paying++;
      const visible = guest.visibleStats!;
      expect(new Set(visible).size).toBe(2);
      const hidden = (Object.keys(guest.hiddenWeights!) as StatType[]).find(
        (k) => guest.hiddenWeights![k] === 0.5
      )!;
      expect(visible).not.toContain(hidden);
    }
    expect(paying).toBeGreaterThan(0);
  });

  it("веса - всегда перестановка 1.5 / 1.0 / 0.5 по трём статам", () => {
    const rng = createRNG(4321);
    for (let i = 0; i < 500; i++) {
      const guest = generateGuest(3, true, rng); // вышибала: все платные
      const values = Object.values(guest.hiddenWeights!).sort();
      expect(values).toEqual([0.5, 1.0, 1.5]);
    }
  });

  it("у бомжа нет предпочтений, видимых статов и аватар фиксирован", () => {
    const rng = createRNG(555);
    let sawBomzh = false;
    for (let i = 0; i < 500; i++) {
      const guest = generateGuest(3, false, rng);
      if (guest.type === "BOMZH") {
        sawBomzh = true;
        expect(guest.visibleStats).toBeNull();
        expect(guest.hiddenWeights).toBeNull();
        expect(guest.avatarKey).toBe(1);
      }
    }
    expect(sawBomzh).toBe(true); // на 500 спавнах бомж точно выпадет (p ~ 1)
  });

  it("avatarKey платного гостя всегда 1..3", () => {
    const rng = createRNG(999);
    for (let i = 0; i < 300; i++) {
      const guest = generateGuest(1, true, rng);
      expect([1, 2, 3]).toContain(guest.avatarKey);
    }
  });

  it("patienceSec всегда 10 из конфига", () => {
    const rng = createRNG(111);
    for (let i = 0; i < 50; i++) {
      expect(generateGuest(1, false, rng).patienceSec).toBe(10);
    }
  });
});

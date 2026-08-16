// src/game/rng.ts
// Детерминированный ГПСЧ: одинаковый seed → одинаковая последовательность.
// Нужен для воспроизводимых тестов движка и синхронизации клиент/сервер.

/** Mulberry32: быстрый детерминированный ГПСЧ, выдаёт [0, 1) */
export function createRNG(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Выбор элемента по весам (рулетка): weights[i] >= 0, сумма > 0 */
export function randomChoice<T>(items: T[], weights: number[], rng: () => number): T {
  if (items.length !== weights.length) {
    throw new Error("randomChoice: items и weights разной длины");
  }
  const total = weights.reduce((sum, w) => sum + w, 0);
  let roll = rng() * total;
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i];
    if (roll < 0) return items[i];
  }
  return items[items.length - 1];
}

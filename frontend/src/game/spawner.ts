// src/game/spawner.ts
// Генератор гостей: класс по весам из config + случайные предпочтения (5).

import { PATIENCE_SEC, SPAWN_RATES_BY_TIER } from "./config";
import { randomChoice } from "./rng";
import type { ClubTier, Guest, GuestType, PreferenceWeights, StatType } from "./types";

// Порядок классов должен совпадать с ключами весов SPAWN_RATES_BY_TIER
const GUEST_TYPES: GuestType[] = ["POOR", "MID", "RICH", "BOMZH"];

const STAT_KEYS: StatType[] = ["talk", "charisma", "service"];

// Уникальный id с фоллбэком для сред без crypto.randomUUID
function makeGuestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "guest-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 9);
}

// Тасование Фишера-Йетса на внешнем rng - детерминированно
function shuffle<T>(items: T[], rng: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Аватар: случайный индекс 1..3 (три варианта картинки у каждого класса гостей)
function rollAvatarKey(rng: () => number): 1 | 2 | 3 {
  return (Math.floor(rng() * 3) + 1) as 1 | 2 | 3;
}

// Вышибала подменяет бомжа платным гостем своего яруса: 1 - голяк, 2 - средняк, 3 - богач
const BOUNCER_SUBSTITUTE: Record<ClubTier, Exclude<GuestType, "BOMZH">> = {
  1: "POOR",
  2: "MID",
  3: "RICH",
};

// Платный гость: перемешанные предпочтения + видимые статы + аватар
function generatePayingGuest(
  type: Exclude<GuestType, "BOMZH">,
  rng: () => number
): Guest {
  // Перемешиваем статы и назначаем веса по порядку: 1.5 / 1.0 / 0.5
  const order = shuffle(STAT_KEYS, rng); // [главный, второй, скрытый]
  const hiddenWeights: PreferenceWeights = {
    talk: 1.0,
    charisma: 1.0,
    service: 1.0,
  };
  hiddenWeights[order[0]] = 1.5;
  hiddenWeights[order[1]] = 1.0;
  hiddenWeights[order[2]] = 0.5;

  // Видимые - главный и второй, порядок случайно перевёрнут, чтобы игрок не знал вес
  const visibleStats: [StatType, StatType] =
    rng() < 0.5 ? [order[0], order[1]] : [order[1], order[0]];

  return {
    id: makeGuestId(),
    type,
    visibleStats,
    hiddenWeights,
    avatarKey: rollAvatarKey(rng),
    patienceSec: PATIENCE_SEC,
  };
}

// Основной вход: один спавн гостя для стола
export function generateGuest(
  tier: ClubTier,
  hasBouncer: boolean,
  rng: () => number
): Guest {
  const rates = SPAWN_RATES_BY_TIER[tier];
  const weights = GUEST_TYPES.map((t) => rates[t]);
  const rolled = randomChoice(GUEST_TYPES, weights, rng);

  if (rolled === "BOMZH") {
    if (hasBouncer) {
      // Вышибала развернул бомжа - на его место садится платный гость яруса
      return generatePayingGuest(BOUNCER_SUBSTITUTE[tier], rng);
    }
    // Бомжа не обслуживают: без предпочтений, одна картинка
    return {
      id: makeGuestId(),
      type: "BOMZH",
      visibleStats: null,
      hiddenWeights: null,
      avatarKey: 1,
      patienceSec: PATIENCE_SEC,
    };
  }

  return generatePayingGuest(rolled, rng);
}

// src/game/shiftEngine.ts
// Машина состояний смены: чистый TS без React. Состояние иммутабельное:
// функции принимают состояние и возвращают новое. Рандом только внешний (rng),
// поэтому полный прогон смены детерминирован по сиду.

import {
  BASE_COOLDOWN_SEC,
  BOMZH_BLOCK_SEC,
  BOMZH_PLACATE_LOSS_YEN,
  BOMZH_PLACATE_SEC,
  BOMZH_PLACATE_STAMINA_DRAIN,
  GUEST_RATES,
  MAJIMA_STAMINA_RESTORE,
  NEON_COOLDOWN_SEC,
  PATIENCE_SEC,
  RICH_RATE_BAR_MULTIPLIER,
  SERVING_SEC,
  SHEIKH_BONUS_YEN_PER_SEC,
  SHEIKH_DURATION_SEC,
  SHEIKH_START_SEC,
  MAJIMA_START_SEC,
  SHIFT_DURATION_SEC,
  STAMINA_BAR_EXTRA,
  STAMINA_DRAIN_ETIQUETTE,
  STAMINA_DRAIN_NORMAL,
  STAMINA_MAX,
  TABLE_STAGGER_SEC,
  VIP_TIP_MATCH_MIN,
  VIP_TIP_YEN,
} from "./config";
import {
  calcMatchMultiplier,
  calcShiftReport,
  getHostessStatus,
  getMatchFeedback,
} from "./economy";
import { generateGuest } from "./spawner";
import type {
  ClubTier,
  GameTable,
  GuestType,
  Hostess,
  HostessId,
  ShiftReport,
} from "./types";

// Бейдж живёт 2 тика (~1.5 с)
const BADGE_TICKS = 2;

// Флаги улучшений и ярус - общий контекст смены, один и тот же для тика и экшенов
export interface ShiftContext {
  tier: ClubTier;
  hasBouncer: boolean;
  hasNeonSign: boolean;
  hasVipInterior: boolean;
  hasPremiumBar: boolean;
  hasEtiquette: boolean;
}

// Результат экшена: либо новое состояние, либо причина отказа для UI
export type ActionResult =
  | { ok: true; state: ShiftEngineState }
  | { ok: false; error: string };

export interface ShiftEngineState {
  shiftId: string;
  startedAt: number; // unix сек, проставляет вызывающий слой (сервер)
  ctx: ShiftContext;
  timeRemainingSec: number; // 300 -> 0
  tables: GameTable[];
  activeHostesses: Hostess[]; // состав смены, задор живёт здесь
  grossIncome: number;
  vipTipsTotal: number;
  bomzhLosses: number;
  servedCount: number;
  angryCount: number;
  bomzhBlockedCount: number;
  bomzhPlacatedCount: number;
  eventsTriggered: { sheikh: boolean; majima: boolean };
  sheikhAuraRemainingSec: number; // аура на столе 1, тикает вниз
}

// Стартовое состояние: стаггер 0/4/8 сек смоделирован начальным COOLDOWN столов
export function createInitialShiftState(
  ctx: ShiftContext,
  roster: Hostess[],
  shiftId = "shift-local",
  startedAt = 0
): ShiftEngineState {
  const tables: GameTable[] = TABLE_STAGGER_SEC.map((stagger, idx) => ({
    id: (idx + 1) as 1 | 2 | 3,
    status: "COOLDOWN",
    guest: null,
    assignedHostessId: null,
    remainingSec: stagger,
    matchMultiplier: 0,
    currentMatchFeedback: null,
    badgeRemainingSec: 0,
    servedYen: 0,
  }));

  return {
    shiftId,
    startedAt,
    ctx,
    timeRemainingSec: SHIFT_DURATION_SEC,
    tables,
    activeHostesses: roster.map((h) => ({ ...h })),
    grossIncome: 0,
    vipTipsTotal: 0,
    bomzhLosses: 0,
    servedCount: 0,
    angryCount: 0,
    bomzhBlockedCount: 0,
    bomzhPlacatedCount: 0,
    eventsTriggered: { sheikh: false, majima: false },
    sheikhAuraRemainingSec: 0,
  };
}

// Хостес занята, пока обслуживает свой стол или возится с бомжом
export function isHostessBusy(state: ShiftEngineState, hostessId: HostessId): boolean {
  return state.tables.some(
    (t) =>
      t.assignedHostessId === hostessId &&
      (t.status === "SERVING" || t.status === "BOMZH_BLOCKED")
  );
}

// Стоимость посадки: этикет снижает базу, бар добавляет 2 за богача (6, 8)
export function staminaCostFor(ctx: ShiftContext, guestType: GuestType): number {
  if (guestType === "BOMZH") return BOMZH_PLACATE_STAMINA_DRAIN;
  let cost = ctx.hasEtiquette ? STAMINA_DRAIN_ETIQUETTE : STAMINA_DRAIN_NORMAL;
  if (guestType === "RICH" && ctx.hasPremiumBar) cost += STAMINA_BAR_EXTRA;
  return cost;
}

// Ровно 1 секунда смены: таймер -> события -> столы
export function shiftTick(state: ShiftEngineState, rng: () => number): ShiftEngineState {
  if (state.timeRemainingSec <= 0) return state;

  const s: ShiftEngineState = {
    ...state,
    tables: state.tables.map((t) => ({ ...t })),
  };
  s.timeRemainingSec -= 1;
  const elapsed = SHIFT_DURATION_SEC - s.timeRemainingSec;

  // Визит Шейха на 30-й секунде: аура на стол 1 (7)
  if (!s.eventsTriggered.sheikh && elapsed >= SHEIKH_START_SEC) {
    s.eventsTriggered = { ...s.eventsTriggered, sheikh: true };
    s.sheikhAuraRemainingSec = SHEIKH_DURATION_SEC;
  }

  // Мадзима с арбузом на 150-й секунде: +20 задора составу, максимум 100 (7)
  if (!s.eventsTriggered.majima && elapsed >= MAJIMA_START_SEC) {
    s.eventsTriggered = { ...s.eventsTriggered, majima: true };
    s.activeHostesses = s.activeHostesses.map((h) => ({
      ...h,
      stamina: Math.min(STAMINA_MAX, h.stamina + MAJIMA_STAMINA_RESTORE),
    }));
  }

  const cooldownSec = s.ctx.hasNeonSign ? NEON_COOLDOWN_SEC : BASE_COOLDOWN_SEC;

  s.tables = s.tables.map((table) => {
    const t: GameTable = { ...table };

    switch (t.status) {
      case "WAITING": {
        // Терпение утекло - гость ушёл злым, стол на паузу (4)
        t.remainingSec -= 1;
        if (t.remainingSec <= 0) {
          s.angryCount += 1;
          t.status = "COOLDOWN";
          t.remainingSec = cooldownSec;
          t.guest = null;
          t.assignedHostessId = null;
        }
        break;
      }
      case "SERVING": {
        // Посекундный стриминг Math.floor(Rate x M) + аура Шейха (4, 7)
        const guest = t.guest!;
        let rate = GUEST_RATES[guest.type];
        if (guest.type === "RICH" && s.ctx.hasPremiumBar) {
          rate *= RICH_RATE_BAR_MULTIPLIER;
        }
        let income = Math.floor(rate * t.matchMultiplier);
        if (s.sheikhAuraRemainingSec > 0 && t.id === 1) {
          income += SHEIKH_BONUS_YEN_PER_SEC;
        }
        s.grossIncome += income;
        t.servedYen += income;
        t.remainingSec -= 1;
        if (t.remainingSec <= 0) {
          // Обслуживание завершено; VIP Tip за идеального богача при VIP-интерьере (8)
          s.servedCount += 1;
          if (
            s.ctx.hasVipInterior &&
            guest.type === "RICH" &&
            t.matchMultiplier >= VIP_TIP_MATCH_MIN
          ) {
            s.vipTipsTotal += VIP_TIP_YEN;
          }
          t.status = "COOLDOWN";
          t.remainingSec = cooldownSec;
          t.guest = null;
          t.assignedHostessId = null;
        }
        break;
      }
      case "BOMZH_BLOCKED": {
        // Бомж отсидел и ушёл сам (7)
        t.remainingSec -= 1;
        if (t.remainingSec <= 0) {
          t.status = "COOLDOWN";
          t.remainingSec = cooldownSec;
          t.guest = null;
          t.assignedHostessId = null;
        }
        break;
      }
      case "COOLDOWN": {
        // Пауза кончилась - за стол садится новый гость (4)
        t.remainingSec -= 1;
        if (t.remainingSec <= 0) {
          const guest = generateGuest(s.ctx.tier, s.ctx.hasBouncer, rng);
          t.guest = guest;
          t.matchMultiplier = 0;
          if (guest.type === "BOMZH") {
            s.bomzhBlockedCount += 1;
            t.status = "BOMZH_BLOCKED";
            t.remainingSec = BOMZH_BLOCK_SEC;
          } else {
            t.status = "WAITING";
            t.remainingSec = PATIENCE_SEC;
          }
        }
        break;
      }
    }

    // Бейдж посадки гаснет сам (5)
    if (t.badgeRemainingSec > 0) {
      t.badgeRemainingSec -= 1;
      if (t.badgeRemainingSec <= 0) {
        t.currentMatchFeedback = null;
        t.badgeRemainingSec = 0;
      }
    }
    return t;
  });

  if (s.sheikhAuraRemainingSec > 0) {
    s.sheikhAuraRemainingSec -= 1;
  }

  return s;
}

// Посадка хостес к ждущему гостю: валидации, M, бейдж, списание задора (5, 6)
export function applyAssign(
  state: ShiftEngineState,
  tableId: 1 | 2 | 3,
  hostessId: HostessId
): ActionResult {
  const table = state.tables.find((t) => t.id === tableId);
  if (!table) return { ok: false, error: "нет такого стола" };
  if (table.status !== "WAITING" || !table.guest) {
    return { ok: false, error: "за столом некого обслуживать" };
  }
  if (table.guest.type === "BOMZH") {
    return { ok: false, error: "бомжа не обслуживают - только успокоить" };
  }
  const hostess = state.activeHostesses.find((h) => h.id === hostessId);
  if (!hostess) return { ok: false, error: "хостес не в составе смены" };
  if (isHostessBusy(state, hostessId)) {
    return { ok: false, error: "хостес уже занята другим столом" };
  }
  const cost = staminaCostFor(state.ctx, table.guest.type);
  if (hostess.stamina < cost) {
    return { ok: false, error: "не хватает задора на посадку" };
  }

  // M фиксируется в момент посадки вместе со штрафом TIRED (5)
  const isTired = getHostessStatus(hostess.stamina) === "TIRED";
  const multiplier = calcMatchMultiplier(hostess.stats, table.guest.hiddenWeights!, isTired);
  const feedback = getMatchFeedback(multiplier);

  const tables = state.tables.map((t) =>
    t.id === tableId
      ? {
          ...t,
          status: "SERVING" as const,
          remainingSec: SERVING_SEC,
          assignedHostessId: hostessId,
          matchMultiplier: multiplier,
          currentMatchFeedback: feedback,
          badgeRemainingSec: BADGE_TICKS,
        }
      : t
  );
  const activeHostesses = state.activeHostesses.map((h) =>
    h.id === hostessId ? { ...h, stamina: h.stamina - cost } : h
  );

  return { ok: true, state: { ...state, tables, activeHostesses } };
}

// Успокоить бомжа: штраф клубу, задор хостес, обрезка таймера до min(остаток, 30) (7)
export function applyPlacateBomzh(
  state: ShiftEngineState,
  tableId: 1 | 2 | 3,
  hostessId: HostessId
): ActionResult {
  const table = state.tables.find((t) => t.id === tableId);
  if (!table) return { ok: false, error: "нет такого стола" };
  if (table.status !== "BOMZH_BLOCKED") {
    return { ok: false, error: "за столом нет бомжа" };
  }
  if (table.assignedHostessId !== null) {
    return { ok: false, error: "бомжа уже успокаивают" };
  }
  const hostess = state.activeHostesses.find((h) => h.id === hostessId);
  if (!hostess) return { ok: false, error: "хостес не в составе смены" };
  if (isHostessBusy(state, hostessId)) {
    return { ok: false, error: "хостес уже занята другим столом" };
  }
  if (hostess.stamina < BOMZH_PLACATE_STAMINA_DRAIN) {
    return { ok: false, error: "не хватает задора на бомжа" };
  }

  const tables = state.tables.map((t) =>
    t.id === tableId
      ? {
          ...t,
          remainingSec: Math.min(t.remainingSec, BOMZH_PLACATE_SEC),
          assignedHostessId: hostessId,
        }
      : t
  );
  const activeHostesses = state.activeHostesses.map((h) =>
    h.id === hostessId
      ? { ...h, stamina: h.stamina - BOMZH_PLACATE_STAMINA_DRAIN }
      : h
  );

  return {
    ok: true,
    state: {
      ...state,
      tables,
      activeHostesses,
      bomzhLosses: state.bomzhLosses + BOMZH_PLACATE_LOSS_YEN,
      bomzhPlacatedCount: state.bomzhPlacatedCount + 1,
    },
  };
}

// Итоговый отчёт смены по формуле 9 - через calcShiftReport из economy
export function finalizeShift(state: ShiftEngineState): ShiftReport {
  return calcShiftReport({
    shiftId: state.shiftId,
    clubTier: state.ctx.tier,
    startedAt: state.startedAt,
    endedAt: state.startedAt + SHIFT_DURATION_SEC,
    guestsServed: state.servedCount,
    guestsLostAngry: state.angryCount,
    bomzhBlocked: state.bomzhBlockedCount,
    bomzhPlacated: state.bomzhPlacatedCount,
    grossYen: state.grossIncome,
    vipTipsYen: state.vipTipsTotal,
    rosterSize: state.activeHostesses.length,
    hasBouncer: state.ctx.hasBouncer,
  });
}

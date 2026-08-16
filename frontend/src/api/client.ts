/// <reference types="vite/client" />
// src/api/client.ts
// Типизированный API-клиент по контракту docs/API.md.
// VITE_USE_MOCK !== "false" (по умолчанию) - запросы идут в мок-сервер в памяти;
// VITE_USE_MOCK === "false" - настоящий fetch на /api/... (твой FastAPI за nginx).

import { createMockServer } from "./mockServer";
import type {
  ClubTier,
  GameTable,
  Guest,
  HostessId,
  MatchFeedback,
  PreferenceWeights,
  ShiftAction,
  ShiftReport,
  StatType,
} from "../game/types";

// ---------- Идентификация (10 раздел MANIFEST: в localStorage только guest_id) ----------

const GUEST_ID_KEY = "cabaret_guest_id";
const TAB_ID_KEY = "cabaret_tab_id";

export function getGuestId(): string {
  let id = localStorage.getItem(GUEST_ID_KEY);
  if (!id) {
    id =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : "fallback-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 11);
    localStorage.setItem(GUEST_ID_KEY, id);
  }
  return id;
}

export function getTabId(): string {
  let id = sessionStorage.getItem(TAB_ID_KEY);
  if (!id) {
    id =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : "tab-" + Date.now().toString(36);
    sessionStorage.setItem(TAB_ID_KEY, id);
  }
  return id;
}

// ---------- Ошибки ----------

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

// ---------- Типы ответов (camelCase домен) ----------

export interface PlayerState {
  yen: number;
  clubTier: ClubTier;
  victory: boolean;
  defeat: boolean;
}

export interface HostessState {
  id: HostessId;
  hired: boolean;
  stamina: number;
}

export interface UpgradeState {
  vipInterior: boolean;
  premiumBar: boolean;
  neonSign: boolean;
  etiquette: boolean;
}

export interface ShiftState {
  shiftId: string;
  startedAt: number;
  timeRemaining: number;
  seed: number;
  tier: ClubTier;
  roster: HostessState[];
  hasBouncer: boolean;
  tables: GameTable[];
  grossIncome: number;
}

export interface InitGameResponse {
  player: PlayerState;
  hostesses: HostessState[];
  upgrades: UpgradeState;
  serverTime: number;
  activeShift: ShiftState | null;
  autoClosedShift: ShiftReport | null;
}

export interface StartShiftResponse {
  shiftId: string;
  startedAt: number;
  durationSec: number;
  seed: number;
  tables: GameTable[];
}

export type ShiftStateResponse = { isActive: false; autoClosedShift?: ShiftReport } | ShiftState;

export interface CompleteShiftResponse {
  report: ShiftReport;
  clamped: boolean;
  player: PlayerState;
  hostesses: HostessState[];
  victory: boolean;
  defeat: boolean;
}

export type RecoverMethod = "SPA" | "VIP_VACATION";
export type PermanentUpgradeId = "VIP_INTERIOR" | "PREMIUM_BAR" | "NEON_SIGN" | "ETIQUETTE";

// ---------- Мапперы snake_case <-> camelCase ----------

// Ответы прилетают как неизвестный JSON - читаем через типизированные ассессоры
type Json = Record<string, unknown>;
const asNum = (v: unknown): number => v as number;
const asStr = (v: unknown): string => v as string;
const asBool = (v: unknown): boolean => v as boolean;
const asArr = (v: unknown): Json[] => (v ?? []) as Json[];

interface GuestDto {
  id: string;
  type: Guest["type"];
  visible_stats: [StatType, StatType] | null;
  hidden_weights: PreferenceWeights | null;
  avatar_key: 1 | 2 | 3;
  patience_sec: number;
}

interface TableDto {
  id: 1 | 2 | 3;
  status: GameTable["status"];
  guest: GuestDto | null;
  assigned_hostess_id: HostessId | null;
  remaining_sec: number;
  match_multiplier: number;
  current_match_feedback: MatchFeedback | null;
  badge_remaining_sec: number;
  served_yen: number;
}

const fromGuest = (d: GuestDto): Guest => ({
  id: d.id,
  type: d.type,
  visibleStats: d.visible_stats,
  hiddenWeights: d.hidden_weights,
  avatarKey: d.avatar_key,
  patienceSec: d.patience_sec,
});

const fromTable = (d: TableDto): GameTable => ({
  id: d.id,
  status: d.status,
  guest: d.guest ? fromGuest(d.guest) : null,
  assignedHostessId: d.assigned_hostess_id,
  remainingSec: d.remaining_sec,
  matchMultiplier: d.match_multiplier,
  currentMatchFeedback: d.current_match_feedback,
  badgeRemainingSec: d.badge_remaining_sec,
  servedYen: d.served_yen,
});

const toGuest = (g: Guest): GuestDto => ({
  id: g.id,
  type: g.type,
  visible_stats: g.visibleStats,
  hidden_weights: g.hiddenWeights,
  avatar_key: g.avatarKey,
  patience_sec: g.patienceSec,
});

const toTable = (t: GameTable): TableDto => ({
  id: t.id,
  status: t.status,
  guest: t.guest ? toGuest(t.guest) : null,
  assigned_hostess_id: t.assignedHostessId,
  remaining_sec: t.remainingSec,
  match_multiplier: t.matchMultiplier,
  current_match_feedback: t.currentMatchFeedback,
  badge_remaining_sec: t.badgeRemainingSec,
  served_yen: t.servedYen,
});

function fromReport(d: Json): ShiftReport {
  return {
    shiftId: asStr(d.shift_id),
    clubTier: asNum(d.club_tier) as ClubTier,
    startedAt: asNum(d.started_at),
    endedAt: asNum(d.ended_at),
    guestsServed: asNum(d.guests_served),
    guestsLostAngry: asNum(d.guests_lost_angry),
    bomzhBlocked: asNum(d.bomzh_blocked),
    bomzhPlacated: asNum(d.bomzh_placated),
    grossYen: asNum(d.gross_yen),
    vipTipsYen: asNum(d.vip_tips_yen),
    rentYen: asNum(d.rent_yen),
    fotYen: asNum(d.fot_yen),
    bouncerYen: asNum(d.bouncer_yen),
    bomzhLossYen: asNum(d.bomzh_loss_yen),
    netYen: asNum(d.net_yen),
  };
}

const toReport = (r: ShiftReport): Json => ({
  shift_id: r.shiftId,
  club_tier: r.clubTier,
  started_at: r.startedAt,
  ended_at: r.endedAt,
  guests_served: r.guestsServed,
  guests_lost_angry: r.guestsLostAngry,
  bomzh_blocked: r.bomzhBlocked,
  bomzh_placated: r.bomzhPlacated,
  gross_yen: r.grossYen,
  vip_tips_yen: r.vipTipsYen,
  rent_yen: r.rentYen,
  fot_yen: r.fotYen,
  bouncer_yen: r.bouncerYen,
  bomzh_loss_yen: r.bomzhLossYen,
  net_yen: r.netYen,
});

function fromPlayer(d: Json): PlayerState {
  return {
    yen: asNum(d.yen),
    clubTier: asNum(d.club_tier) as ClubTier,
    victory: asBool(d.victory),
    defeat: asBool(d.defeat),
  };
}

function fromHostess(d: Json): HostessState {
  return { id: asStr(d.id) as HostessId, hired: asBool(d.hired), stamina: asNum(d.stamina) };
}

function fromUpgrades(d: Json): UpgradeState {
  return {
    vipInterior: asBool(d.vip_interior),
    premiumBar: asBool(d.premium_bar),
    neonSign: asBool(d.neon_sign),
    etiquette: asBool(d.etiquette),
  };
}

function fromShiftState(d: Json): ShiftState {
  return {
    shiftId: asStr(d.shift_id),
    startedAt: asNum(d.started_at),
    timeRemaining: asNum(d.time_remaining),
    seed: asNum(d.seed),
    tier: asNum(d.tier) as ClubTier,
    roster: asArr(d.roster).map(fromHostess),
    hasBouncer: asBool(d.has_bouncer),
    tables: (asArr(d.tables) as unknown as TableDto[]).map(fromTable),
    grossIncome: asNum(d.gross_income),
  };
}

// Экшен camel -> snake
function toActionDto(action: ShiftAction): Json {
  switch (action.type) {
    case "GUEST_SPAWNED":
      return { type: action.type, table_id: action.tableId, guest: toGuest(action.guest) };
    case "ASSIGN":
      return {
        type: action.type,
        table_id: action.tableId,
        hostess_id: action.hostessId,
        match_multiplier: action.matchMultiplier,
        feedback: action.feedback,
      };
    case "PLACATE_BOMZH":
      return { type: action.type, table_id: action.tableId, hostess_id: action.hostessId };
    case "GUEST_LEFT":
      return {
        type: action.type,
        table_id: action.tableId,
        reason: action.reason,
        earned_yen: action.earnedYen,
      };
  }
}

// ---------- Транспорт ----------

const useMock = import.meta.env.VITE_USE_MOCK !== "false";
const mockServer = createMockServer();

async function request<T>(path: string, method: "GET" | "POST", body?: unknown): Promise<T> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-guest-id": getGuestId(),
    "x-tab-id": getTabId(),
  };

  const init: RequestInit = {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  };

  const response = useMock ? await mockServer.fetch(path, init) : await fetch(path, init);

  if (!response.ok) {
    let code = "HTTP_" + response.status;
    let message = response.statusText || "ошибка запроса";
    try {
      const parsed = (await response.json()) as Json;
      const err = parsed.error as Json | undefined;
      if (err?.code) code = asStr(err.code);
      if (err?.message) message = asStr(err.message);
    } catch {
      // тело не JSON - оставляем дефолт
    }
    throw new ApiError(response.status, code, message);
  }

  return (await response.json()) as T;
}

// ---------- Мапперы ответов ----------

function mapShiftState(d: Json): ShiftStateResponse {
  if (!asBool(d.is_active)) {
    return d.auto_closed_shift
      ? { isActive: false, autoClosedShift: fromReport(d.auto_closed_shift as Json) }
      : { isActive: false };
  }
  return fromShiftState(d);
}

function mapInit(d: Json): InitGameResponse {
  return {
    player: fromPlayer(d.player as Json),
    hostesses: asArr(d.hostesses).map(fromHostess),
    upgrades: fromUpgrades(d.upgrades as Json),
    serverTime: asNum(d.server_time),
    activeShift: d.active_shift ? fromShiftState(d.active_shift as Json) : null,
    autoClosedShift: d.auto_closed_shift ? fromReport(d.auto_closed_shift as Json) : null,
  };
}

const mapPlayerHostesses = (d: Json): { player: PlayerState; hostesses: HostessState[] } => ({
  player: fromPlayer(d.player as Json),
  hostesses: asArr(d.hostesses).map(fromHostess),
});

// ---------- Публичное API ----------

export const api = {
  initGame(): Promise<InitGameResponse> {
    return request<Json>("/api/game/init", "GET").then(mapInit);
  },

  async startShift(selectedHostessIds: HostessId[], hasBouncer: boolean): Promise<StartShiftResponse> {
    const d = await request<Json>("/api/shift/start", "POST", {
      selected_hostess_ids: selectedHostessIds,
      has_bouncer: hasBouncer,
    });
    return {
      shiftId: asStr(d.shift_id),
      startedAt: asNum(d.started_at),
      durationSec: asNum(d.duration_sec),
      seed: asNum(d.seed),
      tables: (asArr(d.tables) as unknown as TableDto[]).map(fromTable),
    };
  },

  sendAction(shiftId: string, action: ShiftAction, snapshot: GameTable[]): Promise<{ status: string }> {
    return request<{ status: string }>("/api/shift/action", "POST", {
      shift_id: shiftId,
      action: toActionDto(action),
      snapshot: snapshot.map(toTable),
    });
  },

  getShiftState(): Promise<ShiftStateResponse> {
    return request<Json>("/api/shift/state", "GET").then(mapShiftState);
  },

  async completeShift(shiftId: string, report: ShiftReport): Promise<CompleteShiftResponse> {
    const d = await request<Json>("/api/shift/complete", "POST", {
      shift_id: shiftId,
      report: toReport(report),
    });
    return {
      report: fromReport(d.report as Json),
      clamped: asBool(d.clamped),
      player: fromPlayer(d.player as Json),
      hostesses: asArr(d.hostesses).map(fromHostess),
      victory: asBool(d.victory),
      defeat: asBool(d.defeat),
    };
  },

  hireHostess(hostessId: HostessId): Promise<{ player: PlayerState; hostesses: HostessState[] }> {
    return request<Json>("/api/hostess/hire", "POST", { hostess_id: hostessId }).then((d) =>
      mapPlayerHostesses(d as Json)
    );
  },

  recoverHostess(
    hostessId: HostessId,
    method: RecoverMethod
  ): Promise<{ player: PlayerState; hostesses: HostessState[] }> {
    return request<Json>("/api/hostess/recover", "POST", { hostess_id: hostessId, method }).then((d) =>
      mapPlayerHostesses(d as Json)
    );
  },

  buyUpgrade(
    upgradeId: PermanentUpgradeId
  ): Promise<{ player: PlayerState; upgrades: UpgradeState }> {
    const d = request<Json>("/api/shop/buy", "POST", { upgrade_id: upgradeId });
    return d.then((r) => ({
      player: fromPlayer(r.player as Json),
      upgrades: fromUpgrades(r.upgrades as Json),
    }));
  },

  upgradeClub(): Promise<{ player: PlayerState; victory: boolean }> {
    return request("/api/club/upgrade", "POST", {}).then((d) => {
      const r = d as Json;
      return { player: fromPlayer(r.player as Json), victory: asBool(r.victory) };
    });
  },
};

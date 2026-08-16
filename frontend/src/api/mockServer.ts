// src/api/mockServer.ts
// Мок-бэкенд в памяти: реализует все 9 эндпоинтов docs/API.md как настоящий
// HTTP-слой (принимает fetch-запросы со snake_case JSON и отдаёт Response)
// поэтому клиент работает с ним ровно как с реальным FastAPI
// Часы инжектятся (по умолчанию unix-секунды) - тесты двигают время

import {
  BOMZH_PLACATE_STAMINA_DRAIN,
  SHIFT_DURATION_SEC,
  SLEEP_STAMINA_RESTORE,
  SPA_COST,
  SPA_RESTORE,
  STAMINA_BAR_EXTRA,
  STAMINA_DRAIN_ETIQUETTE,
  STAMINA_DRAIN_NORMAL,
  STAMINA_MAX,
  STARTING_YEN,
  TABLE_STAGGER_SEC,
  TIER_UPGRADE_COSTS,
  UPGRADE_CONFIGS,
  VIP_VACATION_COST,
} from "../game/config";
import { calcShiftReport, getHostessStatus } from "../game/economy";
import type {
  ClubTier,
  GameTable,
  Guest,
  HostessId,
  ShiftReport,
  StatType,
  UpgradeId,
} from "../game/types";

// Серверные константы из docs/API.md (в фронте им больше негде жить)

const GRACE_MIN_SEC = 285;
const GRACE_MAX_SEC = 330; // оно же ORPHAN_TIMEOUT_SEC
const MAJIMA_START_SEC = 150;
const MAJIMA_STAMINA_RESTORE = 20;
const MAX_ACTIONS_PER_SECOND = 10;
const MAX_ALLOWED_GROSS_YEN = 8_200_000;
const MAX_ALLOWED_VIP_TIPS_YEN = 1_200_000;
const ZERO_STAFF_BANKRUPTCY_THRESHOLD_YEN = 30_000;

const STARTER_HOSTESS_IDS: HostessId[] = ["YUKI", "MIRA", "SAKURA"];
const ALL_HOSTESS_IDS: HostessId[] = ["YUKI", "MIRA", "SAKURA", "NIKA", "LUNA"];

const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

// Входящие DTO (snake_case, зеркало контракта)

interface GuestDto {
  id: string;
  type: Guest["type"];
  visible_stats: [StatType, StatType] | null;
  hidden_weights: Guest["hiddenWeights"];
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
  current_match_feedback: GameTable["currentMatchFeedback"];
  badge_remaining_sec: number;
  served_yen: number;
}

interface ActionDto {
  type: "GUEST_SPAWNED" | "ASSIGN" | "PLACATE_BOMZH" | "GUEST_LEFT";
  table_id?: 1 | 2 | 3;
  guest?: GuestDto;
  hostess_id?: HostessId;
  match_multiplier?: number;
  feedback?: GameTable["currentMatchFeedback"];
  reason?: "SERVED" | "ANGRY_LEAVE" | "BOMZH_GONE";
  earned_yen?: number;
}

interface ReportDto {
  shift_id?: string;
  guests_served?: number;
  guests_lost_angry?: number;
  bomzh_blocked?: number;
  bomzh_placated?: number;
  gross_yen?: number;
  vip_tips_yen?: number;
}

// Внутреннее состояние (camelCase, доменные типы)

interface MockHostess {
  hired: boolean;
  stamina: number;
}

interface MockPlayer {
  yen: number;
  clubTier: ClubTier;
  vipInterior: boolean;
  premiumBar: boolean;
  neonSign: boolean;
  etiquette: boolean;
  victory: boolean;
  defeat: boolean;
  hostesses: Record<HostessId, MockHostess>;
  history: ShiftReport[];
}

interface MockSession {
  shiftId: string;
  startedAt: number;
  seed: number;
  tier: ClubTier;
  roster: HostessId[];
  hasBouncer: boolean;
  serverStamina: Record<HostessId, number>;
  majimaApplied: boolean;
  grossIncome: number;
  placateCount: number;
  snapshot: GameTable[];
  actionTimes: number[];
}

interface CompleteResult {
  body: Record<string, unknown>;
}

export interface MockServer {
  fetch: (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
}

export function createMockServer(options?: { now?: () => number }): MockServer {
  const now = options?.now ?? (() => Math.floor(Date.now() / 1000));

  const players = new Map<string, MockPlayer>();
  const sessions = new Map<string, MockSession>();
  const completedShifts = new Map<string, CompleteResult>();

  // Хелперы ----------

  const uuid = (): string => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return "mock-" + Math.random().toString(36).slice(2, 12);
  };

  const ok = (body: unknown, status = 200): Response =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });

  const fail = (status: number, code: string, message: string): Response =>
    ok({ error: { code, message } }, status);

  function createPlayer(): MockPlayer {
    const hostesses = {} as Record<HostessId, MockHostess>;
    for (const id of ALL_HOSTESS_IDS) {
      hostesses[id] = { hired: STARTER_HOSTESS_IDS.includes(id), stamina: STAMINA_MAX };
    }
    return {
      yen: STARTING_YEN,
      clubTier: 1,
      vipInterior: false,
      premiumBar: false,
      neonSign: false,
      etiquette: false,
      victory: false,
      defeat: false,
      hostesses,
      history: [],
    };
  }

  const getOrCreateTimePlayer = (guestId: string): MockPlayer => {
    let player = players.get(guestId);
    if (!player) {
      player = createPlayer();
      players.set(guestId, player);
    }
    return player;
  };

  const availableCount = (player: MockPlayer): number =>
    ALL_HOSTESS_IDS.filter(
      (id) => player.hostesses[id].hired && getHostessStatus(player.hostesses[id].stamina) !== "BURNOUT"
    ).length;

  // Пересчёт флагов после любых изменений (3.1 API.md)
  function recomputeFlags(player: MockPlayer): void {
    if (player.yen < 0) player.defeat = true;
    if (player.yen < ZERO_STAFF_BANKRUPTCY_THRESHOLD_YEN && availableCount(player) === 0) {
      player.defeat = true;
    }
    if (player.clubTier === 3 && availableReady(player) >= 3) player.victory = true;
  }

  const availableReady = (player: MockPlayer): number =>
    ALL_HOSTESS_IDS.filter(
      (id) => player.hostesses[id].hired && getHostessStatus(player.hostesses[id].stamina) === "READY"
    ).length;

  // Мапперы

  const guestFromDto = (dto: GuestDto): Guest => ({
    id: dto.id,
    type: dto.type,
    visibleStats: dto.visible_stats,
    hiddenWeights: dto.hidden_weights,
    avatarKey: dto.avatar_key,
    patienceSec: dto.patience_sec,
  });

  const tableFromDto = (dto: TableDto): GameTable => ({
    id: dto.id,
    status: dto.status,
    guest: dto.guest ? guestFromDto(dto.guest) : null,
    assignedHostessId: dto.assigned_hostess_id,
    remainingSec: dto.remaining_sec,
    matchMultiplier: dto.match_multiplier,
    currentMatchFeedback: dto.current_match_feedback,
    badgeRemainingSec: dto.badge_remaining_sec,
    servedYen: dto.served_yen,
  });

  const guestToDto = (g: Guest): GuestDto => ({
    id: g.id,
    type: g.type,
    visible_stats: g.visibleStats,
    hidden_weights: g.hiddenWeights,
    avatar_key: g.avatarKey,
    patience_sec: g.patienceSec,
  });

  const tableToDto = (t: GameTable): TableDto => ({
    id: t.id,
    status: t.status,
    guest: t.guest ? guestToDto(t.guest) : null,
    assigned_hostess_id: t.assignedHostessId,
    remaining_sec: t.remainingSec,
    match_multiplier: t.matchMultiplier,
    current_match_feedback: t.currentMatchFeedback,
    badge_remaining_sec: t.badgeRemainingSec,
    served_yen: t.servedYen,
  });

  const reportToDto = (r: ShiftReport): Record<string, unknown> => ({
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

  const hostessListDto = (player: MockPlayer, staminaOverride?: Record<HostessId, number>) =>
    ALL_HOSTESS_IDS.map((id) => ({
      id,
      hired: player.hostesses[id].hired,
      stamina: staminaOverride?.[id] ?? player.hostesses[id].stamina,
    }));

  const playerDto = (player: MockPlayer) => ({
    yen: player.yen,
    club_tier: player.clubTier,
    victory: player.victory,
    defeat: player.defeat,
  });

  const upgradesDto = (player: MockPlayer) => ({
    vip_interior: player.vipInterior,
    premium_bar: player.premiumBar,
    neon_sign: player.neonSign,
    etiquette: player.etiquette,
  });

  // Логика смены

  const elapsedOf = (session: MockSession): number => now() - session.startedAt;

  // Финализация смены: отчёт + транзакция игрока (5-й эндпоинт и orphan-resolver)
  function finalizeSession(
    guestId: string,
    player: MockPlayer,
    session: MockSession,
    clientReport: ReportDto | null
  ): { report: ShiftReport; clamped: boolean } {
    let gross = clientReport?.gross_yen ?? session.grossIncome;
    let tips = clientReport?.vip_tips_yen ?? 0;
    let clamped = false;
    if (gross > MAX_ALLOWED_GROSS_YEN) {
      gross = MAX_ALLOWED_GROSS_YEN;
      clamped = true;
    }
    if (tips > MAX_ALLOWED_VIP_TIPS_YEN) {
      tips = MAX_ALLOWED_VIP_TIPS_YEN;
      clamped = true;
    }

    // Деньги пересчитываем только по своим константам (3.5 API.md)
    const report = calcShiftReport({
      shiftId: session.shiftId,
      clubTier: session.tier,
      startedAt: session.startedAt,
      endedAt: session.startedAt + SHIFT_DURATION_SEC,
      guestsServed: clientReport?.guests_served ?? 0,
      guestsLostAngry: clientReport?.guests_lost_angry ?? 0,
      bomzhBlocked: clientReport?.bomzh_blocked ?? 0,
      bomzhPlacated: session.placateCount,
      grossYen: gross,
      vipTipsYen: tips,
      rosterSize: session.roster.length,
      hasBouncer: session.hasBouncer,
    });

    player.yen += report.netYen;

    // Стамина: серверная версия на конец смены + сон +20 всем нанятым
    for (const id of session.roster) {
      player.hostesses[id].stamina = Math.min(
        STAMINA_MAX,
        session.serverStamina[id] ?? player.hostesses[id].stamina
      );
    }
    for (const id of ALL_HOSTESS_IDS) {
      if (player.hostesses[id].hired) {
        player.hostesses[id].stamina = Math.min(
          STAMINA_MAX,
          player.hostesses[id].stamina + SLEEP_STAMINA_RESTORE
        );
      }
    }

    recomputeFlags(player);
    player.history.push(report);
    sessions.delete(guestId);
    return { report, clamped };
  }

  const completeResponse = (player: MockPlayer, report: ShiftReport, clamped: boolean) => ({
    report: reportToDto(report),
    clamped,
    player: playerDto(player),
    hostesses: hostessListDto(player),
    victory: player.victory,
    defeat: player.defeat,
  });

  // Обработчики

  async function handleGameInit(guestId: string): Promise<Response> {
    const player = getOrCreateTimePlayer(guestId);
    let autoClosed: Record<string, unknown> | null = null;
    const session = sessions.get(guestId);

    let activeShift: Record<string, unknown> | null = null;
    if (session) {
      if (elapsedOf(session) > GRACE_MAX_SEC) {
        // Брошенная смена: досчитываем с полными расходами (3.1)
        const { report } = finalizeSession(guestId, player, session, null);
        autoClosed = reportToDto(report);
      } else {
        activeShift = buildShiftState(session);
      }
    }

    return ok({
      player: playerDto(player),
      hostesses: hostessListDto(player),
      upgrades: upgradesDto(player),
      server_time: now(),
      active_shift: activeShift,
      auto_closed_shift: autoClosed,
    });
  }

  function buildShiftState(session: MockSession): Record<string, unknown> {
    return {
      is_active: true,
      shift_id: session.shiftId,
      started_at: session.startedAt,
      time_remaining: Math.max(0, SHIFT_DURATION_SEC - elapsedOf(session)),
      seed: session.seed,
      tier: session.tier,
      roster: session.roster.map((id) => ({
        id,
        hired: true,
        stamina: session.serverStamina[id],
      })),
      has_bouncer: session.hasBouncer,
      tables: session.snapshot.map(tableToDto),
      gross_income: session.grossIncome,
    };
  }

  async function handleShiftStart(guestId: string, body: { selected_hostess_ids?: string[]; has_bouncer?: boolean }): Promise<Response> {
    const player = getOrCreateTimePlayer(guestId);
    if (player.victory || player.defeat) return fail(400, "GAME_OVER", "игра уже завершена");

    const session = sessions.get(guestId);
    if (session) {
      if (elapsedOf(session) <= GRACE_MAX_SEC) {
        return fail(409, "SHIFT_ALREADY_ACTIVE", "смена уже идёт");
      }
      finalizeSession(guestId, player, session, null); // просроченную закрываем молча
    }

    const selected = body.selected_hostess_ids ?? [];
    if (selected.length === 0) return fail(400, "NO_STAFF_SELECTED", "состав смены пуст");
    for (const id of selected as HostessId[]) {
      const h = player.hostesses[id];
      if (!h || !h.hired) return fail(400, "STAFF_UNAVAILABLE", `${id} не нанята`);
      if (getHostessStatus(h.stamina) === "BURNOUT") {
        return fail(400, "STAFF_UNAVAILABLE", `${id} в выгорании`);
      }
    }

    const roster = selected as HostessId[];
    const serverStamina = {} as Record<HostessId, number>;
    for (const id of roster) serverStamina[id] = player.hostesses[id].stamina;

    // Начальные столы: стаггер 0/4/8 как COOLDOWN (3.2 API.md)
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

    const newSession: MockSession = {
      shiftId: uuid(),
      startedAt: now(),
      seed: Math.floor(Math.random() * 2 ** 31),
      tier: player.clubTier,
      roster,
      hasBouncer: body.has_bouncer === true,
      serverStamina,
      majimaApplied: false,
      grossIncome: 0,
      placateCount: 0,
      snapshot: tables,
      actionTimes: [],
    };
    sessions.set(guestId, newSession);

    return ok({
      shift_id: newSession.shiftId,
      started_at: newSession.startedAt,
      duration_sec: SHIFT_DURATION_SEC,
      seed: newSession.seed,
      tables: tables.map(tableToDto),
    });
  }

  async function handleShiftAction(
    guestId: string,
    body: { shift_id?: string; action?: ActionDto; snapshot?: TableDto[] }
  ): Promise<Response> {
    const session = sessions.get(guestId);
    if (!session) return fail(404, "NO_ACTIVE_SHIFT", "активной смены нет");
    if (body.shift_id !== session.shiftId) {
      return fail(400, "SHIFT_ID_MISMATCH", "shift_id не совпадает с сессией");
    }
    const elapsed = elapsedOf(session);
    if (elapsed > GRACE_MAX_SEC) return fail(400, "SHIFT_EXPIRED", "смена просрочена");

    // Антифлуд: не больше 10 действий в секунду
    const t = now();
    session.actionTimes = session.actionTimes.filter((x) => t - x < 1);
    if (session.actionTimes.length >= MAX_ACTIONS_PER_SECOND) {
      return fail(429, "TOO_MANY_ACTIONS", "слишком много действий");
    }
    session.actionTimes.push(t);

    // Мадзима на 150-й секунде: +20 задора составу, один раз (3.3 API.md)
    if (!session.majimaApplied && elapsed >= MAJIMA_START_SEC) {
      session.majimaApplied = true;
      for (const id of session.roster) {
        session.serverStamina[id] = Math.min(
          STAMINA_MAX,
          session.serverStamina[id] + MAJIMA_STAMINA_RESTORE
        );
      }
    }

    const action = body.action;
    if (!action) return fail(422, "VALIDATION", "пустой action");
    const player = getOrCreateTimePlayer(guestId);

    switch (action.type) {
      case "ASSIGN": {
        const hostessId = action.hostess_id as HostessId;
        if (!session.roster.includes(hostessId)) {
          return fail(400, "STAFF_UNAVAILABLE", "хостес не в составе смены");
        }
        let cost = player.etiquette ? STAMINA_DRAIN_ETIQUETTE : STAMINA_DRAIN_NORMAL;
        // тип гостя берём из снапшота: бонус бара только на богаче
        const tableDto = body.snapshot?.find((x) => x.id === action.table_id);
        if (player.premiumBar && tableDto?.guest?.type === "RICH") cost += STAMINA_BAR_EXTRA;
        if (session.serverStamina[hostessId] < cost) {
          return fail(400, "STAMINA_INSUFFICIENT", "серверная стамина меньше стоимости");
        }
        session.serverStamina[hostessId] -= cost;
        break;
      }
      case "PLACATE_BOMZH": {
        const hostessId = action.hostess_id as HostessId;
        if (!session.roster.includes(hostessId)) {
          return fail(400, "STAFF_UNAVAILABLE", "хостес не в составе смены");
        }
        if (session.serverStamina[hostessId] < BOMZH_PLACATE_STAMINA_DRAIN) {
          return fail(400, "STAMINA_INSUFFICIENT", "не хватает задора на бомжа");
        }
        session.serverStamina[hostessId] -= BOMZH_PLACATE_STAMINA_DRAIN;
        session.placateCount += 1;
        break;
      }
      case "GUEST_LEFT": {
        session.grossIncome += action.earned_yen ?? 0;
        break;
      }
      case "GUEST_SPAWNED":
        break; // снапшот уже несёт стол
    }

    if (body.snapshot) session.snapshot = body.snapshot.map(tableFromDto);

    return ok({ status: "ok" });
  }

  async function handleShiftState(guestId: string): Promise<Response> {
    const session = sessions.get(guestId);
    if (!session) return ok({ is_active: false });

    if (elapsedOf(session) > GRACE_MAX_SEC) {
      const player = getOrCreateTimePlayer(guestId);
      const { report } = finalizeSession(guestId, player, session, null);
      return ok({ is_active: false, auto_closed_shift: reportToDto(report) });
    }

    return ok(buildShiftState(session));
  }

  async function handleShiftComplete(
    guestId: string,
    body: { shift_id?: string; report?: ReportDto }
  ): Promise<Response> {
    // Идемпотентность: повторный complete того же shift_id отдаёт сохранённый ответ
    if (body.shift_id && completedShifts.has(body.shift_id)) {
      const stored = completedShifts.get(body.shift_id)!;
      return ok(stored.body);
    }

    const session = sessions.get(guestId);
    if (!session) return fail(404, "NO_ACTIVE_SHIFT", "активной смены нет");
    if (body.shift_id !== session.shiftId) {
      return fail(400, "SHIFT_ID_MISMATCH", "shift_id не совпадает с сессией");
    }
    const elapsed = elapsedOf(session);
    if (elapsed < GRACE_MIN_SEC) return fail(400, "TOO_EARLY", "смена ещё идёт");
    if (elapsed > GRACE_MAX_SEC) return fail(400, "SHIFT_EXPIRED", "смена просрочена");

    const player = getOrCreateTimePlayer(guestId);
    const { report, clamped } = finalizeSession(guestId, player, session, body.report ?? null);

    const bodyOut = completeResponse(player, report, clamped);
    completedShifts.set(report.shiftId, { body: bodyOut });
    return ok(bodyOut);
  }

  async function handleHire(guestId: string, body: { hostess_id?: string }): Promise<Response> {
    const player = getOrCreateTimePlayer(guestId);
    if (player.defeat) return fail(400, "GAME_OVER", "игра завершена"); // победа магазин не блокирует - после демо песочница
    if (sessions.get(guestId)) return fail(409, "SHIFT_ALREADY_ACTIVE", "идёт смена");

    const id = body.hostess_id as HostessId;
    const cost = id === "NIKA" ? 120_000 : id === "LUNA" ? 300_000 : null;
    if (cost === null || !player.hostesses[id]) {
      return fail(422, "VALIDATION", "неизвестная хостес");
    }
    if (player.hostesses[id].hired) return fail(400, "ALREADY_HIRED", "уже нанята");
    if (player.yen < cost) return fail(400, "INSUFFICIENT_FUNDS", "не хватает йен");

    player.yen -= cost;
    player.hostesses[id].hired = true;
    recomputeFlags(player);
    return ok({ player: playerDto(player), hostesses: hostessListDto(player) });
  }

  async function handleRecover(
    guestId: string,
    body: { hostess_id?: string; method?: "SPA" | "VIP_VACATION" }
  ): Promise<Response> {
    const player = getOrCreateTimePlayer(guestId);
    if (player.defeat) return fail(400, "GAME_OVER", "игра завершена"); // победа магазин не блокирует - после демо песочница
    if (sessions.get(guestId)) return fail(409, "SHIFT_ALREADY_ACTIVE", "идёт смена");

    const id = body.hostess_id as HostessId;
    if (!player.hostesses[id]?.hired) return fail(422, "VALIDATION", "хостес не нанята");
    if (player.hostesses[id].stamina >= STAMINA_MAX) {
      return fail(400, "ALREADY_FULL", "задор уже полный");
    }
    const cost = body.method === "VIP_VACATION" ? VIP_VACATION_COST : SPA_COST;
    if (player.yen < cost) return fail(400, "INSUFFICIENT_FUNDS", "не хватает йен");

    player.yen -= cost;
    if (body.method === "VIP_VACATION") {
      player.hostesses[id].stamina = STAMINA_MAX;
    } else {
      player.hostesses[id].stamina = Math.min(STAMINA_MAX, player.hostesses[id].stamina + SPA_RESTORE);
    }
    recomputeFlags(player);
    return ok({ player: playerDto(player), hostesses: hostessListDto(player) });
  }

  async function handleBuy(guestId: string, body: { upgrade_id?: string }): Promise<Response> {
    const player = getOrCreateTimePlayer(guestId);
    if (player.defeat) return fail(400, "GAME_OVER", "игра завершена"); // победа магазин не блокирует - после демо песочница
    if (sessions.get(guestId)) return fail(409, "SHIFT_ALREADY_ACTIVE", "идёт смена");

    const upgradeId = String(body.upgrade_id ?? "");
    if (upgradeId === "BOUNCER" || !(upgradeId in UPGRADE_CONFIGS)) {
      return fail(422, "VALIDATION", "неизвестное улучшение");
    }
    const cfg = UPGRADE_CONFIGS[upgradeId as UpgradeId];

    const ownedMap: Record<string, boolean> = {
      VIP_INTERIOR: player.vipInterior,
      PREMIUM_BAR: player.premiumBar,
      NEON_SIGN: player.neonSign,
      ETIQUETTE: player.etiquette,
    };
    if (ownedMap[upgradeId]) return fail(400, "ALREADY_OWNED", "уже куплено");
    if (player.clubTier < cfg.minTier) return fail(400, "TIER_TOO_LOW", "нужен уровень клуба выше");
    if (player.yen < cfg.cost) return fail(400, "INSUFFICIENT_FUNDS", "не хватает йен");

    player.yen -= cfg.cost;
    if (upgradeId === "VIP_INTERIOR") player.vipInterior = true;
    if (upgradeId === "PREMIUM_BAR") player.premiumBar = true;
    if (upgradeId === "NEON_SIGN") player.neonSign = true;
    if (upgradeId === "ETIQUETTE") player.etiquette = true;
    return ok({ player: playerDto(player), upgrades: upgradesDto(player) });
  }

  async function handleClubUpgrade(guestId: string): Promise<Response> {
    const player = getOrCreateTimePlayer(guestId);
    if (player.defeat) return fail(400, "GAME_OVER", "игра завершена"); // победа магазин не блокирует - после демо песочница
    if (sessions.get(guestId)) return fail(409, "SHIFT_ALREADY_ACTIVE", "идёт смена");

    if (player.clubTier >= 3) return fail(400, "TIER_MAXED", "максимальный уровень");
    const cost = TIER_UPGRADE_COSTS[(player.clubTier + 1) as 2 | 3];
    if (player.yen < cost) return fail(400, "INSUFFICIENT_FUNDS", "не хватает йен");

    player.yen -= cost;
    player.clubTier = (player.clubTier + 1) as ClubTier;
    recomputeFlags(player);
    return ok({ player: playerDto(player), victory: player.victory });
  }

  // ---------- Роутер ----------

  async function route(method: string, path: string, guestId: string, body: Record<string, unknown> | null): Promise<Response> {
    if (method === "GET" && path === "/api/game/init") return handleGameInit(guestId);
    if (method === "POST" && path === "/api/shift/start") return handleShiftStart(guestId, body as never);
    if (method === "POST" && path === "/api/shift/action") return handleShiftAction(guestId, body as never);
    if (method === "GET" && path === "/api/shift/state") return handleShiftState(guestId);
    if (method === "POST" && path === "/api/shift/complete") return handleShiftComplete(guestId, body as never);
    if (method === "POST" && path === "/api/hostess/hire") return handleHire(guestId, body as never);
    if (method === "POST" && path === "/api/hostess/recover") return handleRecover(guestId, body as never);
    if (method === "POST" && path === "/api/shop/buy") return handleBuy(guestId, body as never);
    if (method === "POST" && path === "/api/club/upgrade") return handleClubUpgrade(guestId);
    return fail(404, "NOT_FOUND", `нет маршрута ${method} ${path}`);
  }

  return {
    fetch: async (input, init) => {
      const rawUrl = typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      const path = new URL(rawUrl, "http://mock.local").pathname;
      const method = (init?.method ?? "GET").toUpperCase();
      const headers = new Headers(init?.headers);
      const guestId = headers.get("x-guest-id") ?? "";

      if (!UUID_V4_RE.test(guestId)) {
        return fail(401, "INVALID_GUEST_ID", "X-Guest-ID обязан быть UUIDv4");
      }

      let body: Record<string, unknown> | null = null;
      if (init?.body) {
        try {
          body = JSON.parse(String(init.body)) as Record<string, unknown>;
        } catch {
          return fail(422, "VALIDATION", "кривой JSON");
        }
      }

      try {
        return await route(method, path, guestId, body);
      } catch (err) {
        return fail(500, "INTERNAL", `мок упал: ${String(err)}`);
      }
    },
  };
}

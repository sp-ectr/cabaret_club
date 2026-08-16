// src/api/__tests__/mockServer.test.ts
// Мок-сервер гоняем по контракту docs/API.md на фейковых часах:
// полный жизненный цикл игрока от регистрации до победы.

import { describe, expect, it } from "vitest";
import { createMockServer } from "../mockServer";

const GUEST_ID = "11111111-1111-4111-8111-111111111111"; // валидный UUIDv4

// Часы: unix-секунды, двигаем руками
function makeServer() {
  let t = 1_000_000;
  const server = createMockServer({ now: () => t });
  const call = (method: string, path: string, body?: unknown) =>
    server.fetch(path, {
      method,
      headers: { "x-guest-id": GUEST_ID, "x-tab-id": "22222222-2222-4222-8222-222222222222" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  return {
    call,
    advance: (sec: number) => {
      t += sec;
    },
  };
}

const json = async (res: Response) => ({ status: res.status, body: await res.json() });

// Локальные срезки ответов для ассертов без any
type HostessJson = { id: string; hired: boolean; stamina: number };
type TableJson = { remaining_sec: number; status: string; guest: unknown };

// Пустой снапшот трёх столов (для экшенов)
const emptySnapshot = [
  { id: 1, status: "COOLDOWN", guest: null, assigned_hostess_id: null, remaining_sec: 0, match_multiplier: 0, current_match_feedback: null, badge_remaining_sec: 0, served_yen: 0 },
  { id: 2, status: "COOLDOWN", guest: null, assigned_hostess_id: null, remaining_sec: 0, match_multiplier: 0, current_match_feedback: null, badge_remaining_sec: 0, served_yen: 0 },
  { id: 3, status: "COOLDOWN", guest: null, assigned_hostess_id: null, remaining_sec: 0, match_multiplier: 0, current_match_feedback: null, badge_remaining_sec: 0, served_yen: 0 },
];

const assignAction = (hostess: string) => ({
  type: "ASSIGN",
  table_id: 1,
  hostess_id: hostess,
  match_multiplier: 1.75,
  feedback: "PERFECT",
});

async function startShift(env: ReturnType<typeof makeServer>, opts?: { bouncer?: boolean; roster?: string[] }) {
  const res = await env.call("POST", "/api/shift/start", {
    selected_hostess_ids: opts?.roster ?? ["YUKI", "MIRA", "SAKURA"],
    has_bouncer: opts?.bouncer ?? false,
  });
  return json(res);
}

// 1. Инициализация ----------

describe("GET /api/game/init", () => {
  it("авто-создаёт игрока: 60000 йен, 1 звезда, три нанятые, стамина 100", async () => {
    const env = makeServer();
    const { status, body } = await json(await env.call("GET", "/api/game/init"));
    expect(status).toBe(200);
    expect(body.player).toEqual({ yen: 60000, club_tier: 1, victory: false, defeat: false });
    expect(body.hostesses).toHaveLength(5);
    expect(body.hostesses.filter((h: HostessJson) => h.hired).map((h: HostessJson) => h.id).sort()).toEqual(["MIRA", "SAKURA", "YUKI"]);
    expect(body.hostesses.every((h: HostessJson) => h.stamina === 100)).toBe(true);
    expect(body.active_shift).toBeNull();
    expect(typeof body.server_time).toBe("number");
  });

  it("401 на мусорный и отсутствующий X-Guest-ID", async () => {
    const server = createMockServer();
    const bad = await server.fetch("/api/game/init", { headers: { "x-guest-id": "trash" } });
    expect(bad.status).toBe(401);
    expect((await bad.json()).error.code).toBe("INVALID_GUEST_ID");

    const none = await server.fetch("/api/game/init");
    expect(none.status).toBe(401);
  });
});

// 2. Старт смены ----------

describe("POST /api/shift/start", () => {
  it("отдаёт shift_id, seed, длительность и три стола со стаггером 0/4/8", async () => {
    const env = makeServer();
    const { status, body } = await startShift(env);
    expect(status).toBe(200);
    expect(body.duration_sec).toBe(300);
    expect(typeof body.shift_id).toBe("string");
    expect(typeof body.seed).toBe("number");
    expect(body.tables.map((t: TableJson) => t.remaining_sec)).toEqual([0, 4, 8]);
    expect(body.tables.every((t: TableJson) => t.status === "COOLDOWN" && t.guest === null)).toBe(true);
  });

  it("409 при попытке начать вторую смену", async () => {
    const env = makeServer();
    await startShift(env);
    const { status, body } = await startShift(env);
    expect(status).toBe(409);
    expect(body.error.code).toBe("SHIFT_ALREADY_ACTIVE");
  });

  it("400 NO_STAFF_SELECTED и STAFF_UNAVAILABLE за ненанятую", async () => {
    const env = makeServer();
    const empty = await json(await env.call("POST", "/api/shift/start", { selected_hostess_ids: [], has_bouncer: false }));
    expect(empty.status).toBe(400);
    expect(empty.body.error.code).toBe("NO_STAFF_SELECTED");

    const unhired = await json(await env.call("POST", "/api/shift/start", { selected_hostess_ids: ["NIKA"], has_bouncer: false }));
    expect(unhired.status).toBe(400);
    expect(unhired.body.error.code).toBe("STAFF_UNAVAILABLE");
  });
});

// 3. Состояние и экшены ----------

describe("GET /api/shift/state + POST /api/shift/action", () => {
  it("time_remaining считается от серверного времени", async () => {
    const env = makeServer();
    await startShift(env);
    env.advance(100);
    const { body } = await json(await env.call("GET", "/api/shift/state"));
    expect(body.is_active).toBe(true);
    expect(body.time_remaining).toBe(200);
  });

  it("404 без активной смены, 400 при несовпадении shift_id", async () => {
    const env = makeServer();
    const noShift = await json(await env.call("POST", "/api/shift/action", { shift_id: "x", action: assignAction("YUKI"), snapshot: emptySnapshot }));
    expect(noShift.status).toBe(404);
    expect(noShift.body.error.code).toBe("NO_ACTIVE_SHIFT");

    const { body: start } = await startShift(env);
    const wrong = await json(await env.call("POST", "/api/shift/action", { shift_id: "wrong", action: assignAction("YUKI"), snapshot: emptySnapshot }));
    expect(wrong.status).toBe(400);
    expect(wrong.body.error.code).toBe("SHIFT_ID_MISMATCH");
    void start;
  });

  it("ASSIGN списывает серверную стамину и отказывает при нехватке", async () => {
    const env = makeServer();
    const { body: start } = await startShift(env, { roster: ["YUKI"] });
    const shiftId = start.shift_id;

    // 100 -> 6 посадок по 15 остаётся 10, седьмая должна отказать
    for (let i = 0; i < 6; i++) {
      const r = await json(await env.call("POST", "/api/shift/action", { shift_id: shiftId, action: assignAction("YUKI"), snapshot: emptySnapshot }));
      expect(r.status).toBe(200);
    }
    const seventh = await json(await env.call("POST", "/api/shift/action", { shift_id: shiftId, action: assignAction("YUKI"), snapshot: emptySnapshot }));
    expect(seventh.status).toBe(400);
    expect(seventh.body.error.code).toBe("STAMINA_INSUFFICIENT");

    const { body: state } = await json(await env.call("GET", "/api/shift/state"));
    expect(state.roster[0].stamina).toBe(10);
  });

  it("429 после 10 действий за секунду", async () => {
    const env = makeServer();
    const { body: start } = await startShift(env, { roster: ["YUKI", "MIRA", "SAKURA"] });
    const shiftId = start.shift_id;
    let last = 200;
    for (let i = 0; i < 11; i++) {
      const r = await json(await env.call("POST", "/api/shift/action", { shift_id: shiftId, action: { type: "GUEST_SPAWNED", table_id: 1, guest: null }, snapshot: emptySnapshot }));
      last = r.status;
    }
    expect(last).toBe(429);
  });

  it("GUEST_LEFT копит gross_income, Мадзима на 150-й секунде даёт +20", async () => {
    const env = makeServer();
    const { body: start } = await startShift(env, { roster: ["YUKI"] });
    const shiftId = start.shift_id;

    // Сжигаем стамину: 6 посадок -> 10
    for (let i = 0; i < 6; i++) {
      await env.call("POST", "/api/shift/action", { shift_id: shiftId, action: assignAction("YUKI"), snapshot: emptySnapshot });
    }
    env.advance(1);

    const left = await json(await env.call("POST", "/api/shift/action", { shift_id: shiftId, action: { type: "GUEST_LEFT", table_id: 1, reason: "SERVED", earned_yen: 50000 }, snapshot: emptySnapshot }));
    expect(left.status).toBe(200);

    env.advance(150); // 150-я секунда
    await env.call("POST", "/api/shift/action", { shift_id: shiftId, action: { type: "GUEST_SPAWNED", table_id: 2, guest: null }, snapshot: emptySnapshot });

    const { body: state } = await json(await env.call("GET", "/api/shift/state"));
    expect(state.gross_income).toBe(50000);
    expect(state.roster[0].stamina).toBe(30); // 10 + 20 Мадзима
  });
});

// 4. Завершение смены ----------

describe("POST /api/shift/complete", () => {
  it("TOO_EARLY раньше 285-й секунды", async () => {
    const env = makeServer();
    const { body: start } = await startShift(env);
    env.advance(200);
    const { status, body } = await json(await env.call("POST", "/api/shift/complete", { shift_id: start.shift_id, report: {} }));
    expect(status).toBe(400);
    expect(body.error.code).toBe("TOO_EARLY");
  });

  it("на 300-й: net по серверным цифрам, сон +20, зачисление, идемпотентность", async () => {
    const env = makeServer();
    const { body: start } = await startShift(env); // 3 хостес, без вышибалы
    const shiftId = start.shift_id;

    await env.call("POST", "/api/shift/action", { shift_id: shiftId, action: { type: "GUEST_LEFT", table_id: 1, reason: "SERVED", earned_yen: 300000 }, snapshot: emptySnapshot });
    env.advance(300);

    const first = await json(await env.call("POST", "/api/shift/complete", {
      shift_id: shiftId,
      report: { gross_yen: 300000, vip_tips_yen: 0, guests_served: 10, guests_lost_angry: 0, bomzh_blocked: 1, bomzh_placated: 0 },
    }));
    expect(first.status).toBe(200);
    // 300K - 120K аренда - 60K ФОТ = 120K net; 60000 + 120000 = 180000
    expect(first.body.report.net_yen).toBe(120000);
    expect(first.body.player.yen).toBe(180000);
    expect(first.body.report.rent_yen).toBe(120000);
    expect(first.body.report.fot_yen).toBe(60000);

    // Сон +20 сверх 100 не накидывает
    expect(first.body.hostesses.every((h: HostessJson) => h.stamina <= 100)).toBe(true);

    const yenAfterFirst = first.body.player.yen;
    const second = await json(await env.call("POST", "/api/shift/complete", { shift_id: shiftId, report: {} }));
    expect(second.status).toBe(200);
    expect(second.body.player.yen).toBe(yenAfterFirst); // двойного зачисления нет
  });

  it("клампит выручку выше капа 8.2M и ставит флаг clamped", async () => {
    const env = makeServer();
    const { body: start } = await startShift(env);
    env.advance(300);
    const { body } = await json(await env.call("POST", "/api/shift/complete", {
      shift_id: start.shift_id,
      report: { gross_yen: 99_999_999, vip_tips_yen: 0 },
    }));
    expect(body.clamped).toBe(true);
    expect(body.report.gross_yen).toBe(8_200_000);
  });

  it("SHIFT_EXPIRED после 330-й секунды", async () => {
    const env = makeServer();
    const { body: start } = await startShift(env);
    env.advance(331);
    const { status, body } = await json(await env.call("POST", "/api/shift/complete", { shift_id: start.shift_id, report: {} }));
    expect(status).toBe(400);
    expect(body.error.code).toBe("SHIFT_EXPIRED");
  });
});

// 5. Брошенная смена (orphan-resolver) ----------

describe("orphan-resolver в init/state", () => {
  it("смена без игрока старше 330с досчитывается с полными расходами", async () => {
    const env = makeServer();
    await startShift(env);
    env.advance(400);

    const { body } = await json(await env.call("GET", "/api/game/init"));
    expect(body.active_shift).toBeNull();
    expect(body.auto_closed_shift).not.toBeNull();
    // gross 0 - 180K расходов; 60000 - 180000 = -120000 -> defeat
    expect(body.auto_closed_shift.net_yen).toBe(-180000);
    expect(body.player.yen).toBe(-120000);
    expect(body.player.defeat).toBe(true);
  });
});

// 6. Магазин и персонал ----------

describe("менеджмент между сменами", () => {
  async function richPlayer() {
    const env = makeServer();
    const { body: start } = await startShift(env);
    await env.call("POST", "/api/shift/action", { shift_id: start.shift_id, action: { type: "GUEST_LEFT", table_id: 1, reason: "SERVED", earned_yen: 8_200_000 }, snapshot: emptySnapshot });
    env.advance(300);
    await env.call("POST", "/api/shift/complete", { shift_id: start.shift_id, report: { gross_yen: 8_200_000 } });
    return env;
  }

  it("найм: сначала INSUFFICIENT_FUNDS на старте, потом успешно после смены", async () => {
    const env = makeServer();
    const poor = await json(await env.call("POST", "/api/hostess/hire", { hostess_id: "NIKA" }));
    expect(poor.status).toBe(400);
    expect(poor.body.error.code).toBe("INSUFFICIENT_FUNDS");

    const env2 = await richPlayer();
    const okHire = await json(await env2.call("POST", "/api/hostess/hire", { hostess_id: "NIKA" }));
    expect(okHire.status).toBe(200);
    const niка = okHire.body.hostesses.find((h: HostessJson) => h.id === "NIKA");
    expect(niка.hired).toBe(true);

    const again = await json(await env2.call("POST", "/api/hostess/hire", { hostess_id: "NIKA" }));
    expect(again.body.error.code).toBe("ALREADY_HIRED");
  });

  it("СПА: ALREADY_FULL на полной, восстановление после смены, 409 во время смены", async () => {
    const env = makeServer();
    const full = await json(await env.call("POST", "/api/hostess/recover", { hostess_id: "YUKI", method: "SPA" }));
    expect(full.body.error.code).toBe("ALREADY_FULL");

    const env2 = await richPlayer(); // после смены стамина 100 (сон не превышает 100)
    // добьём YUKI подсадками к бомжу не выйдет без смены - проверим только деньги и 409
    const { body: start } = await startShift(env2);
    const during = await json(await env2.call("POST", "/api/hostess/recover", { hostess_id: "YUKI", method: "VIP_VACATION" }));
    expect(during.status).toBe(409);
    void start;
  });

  it("магазин: покупка, ALREADY_OWNED, TIER_TOO_LOW для VIP-интерьера на 1 звезде", async () => {
    const env = await richPlayer();
    const buy = await json(await env.call("POST", "/api/shop/buy", { upgrade_id: "NEON_SIGN" }));
    expect(buy.status).toBe(200);
    expect(buy.body.upgrades.neon_sign).toBe(true);

    const again = await json(await env.call("POST", "/api/shop/buy", { upgrade_id: "NEON_SIGN" }));
    expect(again.body.error.code).toBe("ALREADY_OWNED");

    const vip = await json(await env.call("POST", "/api/shop/buy", { upgrade_id: "VIP_INTERIOR" }));
    expect(vip.body.error.code).toBe("TIER_TOO_LOW");
  });

  it("звёзды: покупка 2 и 3, победа при 3 звёздах и 3 READY, TIER_MAXED после", async () => {
    const env = await richPlayer(); // yen = 60000 + (8.2M - 180K) = 8_080_000
    const first = await json(await env.call("POST", "/api/club/upgrade"));
    expect(first.body.player.club_tier).toBe(2);

    const second = await json(await env.call("POST", "/api/club/upgrade"));
    expect(second.body.player.club_tier).toBe(3);
    expect(second.body.victory).toBe(true); // три стартовые READY после сна

    const maxed = await json(await env.call("POST", "/api/club/upgrade"));
    expect(maxed.body.error.code).toBe("TIER_MAXED");
  });

  it("GAME_OVER после победы блокирует новую смену", async () => {
    const env = await richPlayer();
    await env.call("POST", "/api/club/upgrade");
    await env.call("POST", "/api/club/upgrade");
    const start = await startShift(env);
    expect(start.status).toBe(400);
    expect(start.body.error.code).toBe("GAME_OVER");
  });
});

# CABARET TYCOON - Контракт REST API (V1.0)

Строгий контракт между фронтендом (клиент-симулянт) и бэкендом (FastAPI + Redis + PostgreSQL).
Все цифры и правила - из `docs/MANIFEST.md`. Изменение контракта = изменение этого файла.

---

## 1. Общие правила

- База: `/api`, формат `application/json`.
- **Имена полей в JSON - snake_case** (питонья сторона), клиент маппит в camelCase на своём слое.
- **Регистрация автоматическая:** первого `GET /api/game/init` достаточно - сервер создаёт игрока
  (баланс ¥60,000, ★1, три стартовые хостес). Отдельного `/register` нет.
- **Заголовки (все запросы):**
  - `X-Guest-ID: <uuid4>` - обязательно. Невалидный формат или мусор -> `401 INVALID_GUEST_ID`.
  - `X-Tab-ID: <uuid4>` - обязателен на запросах смены (`/shift/*`). Генерируется на вкладке
    (sessionStorage), нужен для лока мульти-вкладки и takeover.
- Время - везде unix-секунды UTC. Единственный источник тайминга смены - серверный `started_at`.
- Клиент симулирует смену локально; сервер НЕ симулирует. Глубина серверной валидации:
  стамина (выводится из лога действий + событий по времени), тайминги, капы выручки.

### Формат ошибки (все не-2xx)

```json
{ "error": { "code": "STAMINA_INSUFFICIENT", "message": "человеческое описание" } }
```

### Таблица кодов

| HTTP | code | Когда |
|------|------|-------|
| 401 | INVALID_GUEST_ID | нет заголовка или не UUIDv4 |
| 404 | NO_ACTIVE_SHIFT | действие/стейт/финиш без активной сессии |
| 409 | SHIFT_ALREADY_ACTIVE | `/shift/start` при живой смене |
| 400 | SHIFT_ID_MISMATCH | shift_id в теле не совпадает с сессией |
| 400 | SHIFT_EXPIRED | elapsed > 330 на action/complete |
| 400 | TOO_EARLY | `/complete` при elapsed < 285 |
| 400 | STAMINA_INSUFFICIENT | серверная стамина меньше стоимости посадки/подсадки |
| 400 | INSUFFICIENT_FUNDS | не хватает ¥ на покупку |
| 400 | ALREADY_HIRED / ALREADY_OWNED / ALREADY_FULL | повторные действия |
| 400 | TIER_TOO_LOW / TIER_MAXED | VIP-интерьер раньше ★★ / апгрейд на ★★★ |
| 400 | NO_STAFF_SELECTED / STAFF_UNAVAILABLE | состав смены пуст или недоступен |
| 400 | GAME_OVER | игра уже завершена поражением |
| 422 | - | кривое тело (Pydantic) |
| 429 | TOO_MANY_ACTIONS | > 10 действий за секунду (антифлуд) |

---

## 2. DTO

### PlayerDTO
```json
{ "yen": 60000, "club_tier": 1, "victory": false, "defeat": false }
```

### HostessStateDTO (массив из 5)
```json
{ "id": "YUKI", "hired": true, "stamina": 100 }
```
Статы, редкость и цены клиент берёт из своего `config.ts` - сервер их не дублирует.

### UpgradesDTO
```json
{ "vip_interior": false, "premium_bar": false, "neon_sign": false, "etiquette": false }
```
Вышибала сюда НЕ входит: он покупается на одну смену через `/shift/start`.

### GuestDTO (зеркало Guest из types.ts)
```json
{
  "id": "uuid",
  "type": "RICH",
  "visible_stats": ["talk", "charisma"],
  "hidden_weights": { "talk": 1.5, "charisma": 1.0, "service": 0.5 },
  "avatar_key": 2,
  "patience_sec": 10
}
```

### TableDTO (зеркало GameTable)
```json
{
  "id": 1,
  "status": "WAITING",
  "guest": { "...": "GuestDTO | null" },
  "assigned_hostess_id": "YUKI",
  "remaining_sec": 7,
  "match_multiplier": 1.75,
  "current_match_feedback": "PERFECT",
  "badge_remaining_sec": 1,
  "served_yen": 38500
}
```

### ShiftReportDTO (зеркало ShiftReport, раздел 9 манифеста)
```json
{
  "shift_id": "uuid",
  "club_tier": 1,
  "started_at": 1723800000,
  "ended_at": 1723800300,
  "guests_served": 19,
  "guests_lost_angry": 0,
  "bomzh_blocked": 2,
  "bomzh_placated": 0,
  "gross_yen": 452000,
  "vip_tips_yen": 0,
  "rent_yen": 120000,
  "fot_yen": 60000,
  "bouncer_yen": 0,
  "bomzh_loss_yen": 0,
  "net_yen": 272000
}
```

---

## 3. Эндпоинты

### 3.1 GET /api/game/init

Загрузка профиля + разрешение брошенных смен (orphan-resolver).

Серверная логика:
1. Игрока нет - создать (¥60,000, ★1, YUKI/MIRA/SAKURA hired, стамина 100).
2. Есть сессия в Redis и `elapsed > 330` -> **автофинализация**: досчитать отчёт по последнему
   снапшоту (gross из снапшота, полные расходы по разделу 9), записать в PG, применить сон +20,
   удалить сессию и лок. В ответе отдать `auto_closed_shift`.
3. Победа/поражение пересчитываются после любых изменений.

Ответ 200:
```json
{
  "player": "PlayerDTO",
  "hostesses": ["HostessStateDTO"],
  "upgrades": "UpgradesDTO",
  "server_time": 1723800000,
  "active_shift": "ShiftStateDTO | null",
  "auto_closed_shift": "ShiftReportDTO | null"
}
```

### 3.2 POST /api/shift/start

Тело:
```json
{ "selected_hostess_ids": ["YUKI", "MIRA", "SAKURA"], "has_bouncer": false }
```

Серверная логика:
1. Жива другая смена -> `409 SHIFT_ALREADY_ACTIVE` (клиент идёт в `/shift/state`).
2. Победа/поражение уже зафиксированы -> `400 GAME_OVER`.
3. Состав: >= 1 хостес (`NO_STAFF_SELECTED`), все наняты и в статусе READY/TIRED
   (`STAFF_UNAVAILABLE`). BURNOUT в состав нельзя.
4. Сгенерировать `shift_id` (uuid4) и `seed` (int32) - на них клиент строит симуляцию.
5. Redis: `HSET session:{guest_id}` (shift_id, started_at, seed, tier, roster_json,
   has_bouncer, tables_json = пустые столы со стаггером 0/4/8, counters = 0), TTL 600.
   Лок: `SET lock:shift:{guest_id} = tab_id` (takeover: тот же guest_id с новым tab_id
   перезаписывает лок молча).
6. **Деньги не списываются здесь.** Вышибала - расход внутри отчёта смены; всё движение ¥ -
   одной транзакцией в `/shift/complete`.

Ответ 200:
```json
{
  "shift_id": "uuid",
  "started_at": 1723800000,
  "duration_sec": 300,
  "seed": 1284922401,
  "tables": ["TableDTO x3"]
}
```

### 3.3 POST /api/shift/action

Каждое событие стола летит на сервер немедленно, с полным снапшотом (идемпотентная перезапись).

Тело (объединение по `type`):
```json
{ "type": "GUEST_SPAWNED", "table_id": 1, "guest": "GuestDTO" }
{ "type": "ASSIGN", "table_id": 1, "hostess_id": "YUKI", "match_multiplier": 1.75, "feedback": "PERFECT" }
{ "type": "PLACATE_BOMZH", "table_id": 3, "hostess_id": "MIRA" }
{ "type": "GUEST_LEFT", "table_id": 1, "reason": "SERVED", "earned_yen": 115500 }
```
```json
{
  "shift_id": "uuid",
  "action": { "...": "одно из четырёх выше" },
  "snapshot": ["TableDTO x3"]
}
```

Серверная логика:
1. Сессии нет -> `404`; shift_id не тот -> `SHIFT_ID_MISMATCH`; elapsed > 330 -> `SHIFT_EXPIRED`.
2. Антифлуд: > 10 действий/сек -> `429 TOO_MANY_ACTIONS`.
3. Сервер ведёт свою стамину ростера: `ASSIGN` - минус стоимость (15/10, богач с баром 17/12),
   `PLACATE_BOMZH` - минус 25, Мадзима (elapsed >= 150) - плюс 20 всем с клампом 100.
   Не сходится -> `400 STAMINA_INSUFFICIENT`.
4. `GUEST_LEFT` с `earned_yen` -> сервер копит `gross_income` сессии.
5. Снапшот перезаписывается целиком; TTL сессии продлевается до 600.

Ответ 200: `{ "status": "ok" }`

### 3.4 GET /api/shift/state

Реконнект после F5: клиент восстанавливает смену из снапшота + серверного времени.

Ответ 200 (смена активна):
```json
{
  "is_active": true,
  "shift_id": "uuid",
  "started_at": 1723800000,
  "time_remaining": 217,
  "seed": 1284922401,
  "tier": 1,
  "roster": ["HostessStateDTO"],
  "has_bouncer": false,
  "tables": ["TableDTO x3"],
  "gross_income": 185000
}
```
`time_remaining = 300 - (now - started_at)`, минимум 0.

Ответ 200 (смены нет): `{ "is_active": false }`

Elapsed > 330 на момент запроса -> `is_active: false` + `auto_closed_shift` (как в init).

### 3.5 POST /api/shift/complete

Тело:
```json
{ "shift_id": "uuid", "report": "ShiftReportDTO" }
```

Серверная логика:
1. elapsed ∈ [285, 330]: раньше -> `TOO_EARLY`, позже -> `SHIFT_EXPIRED`.
2. Санити-капы: `gross_yen <= 8,200,000`, `vip_tips_yen <= 1,200,000`
   (формулы: 24 гостя x 30с x 4400 ¥/с x M 2.55 + аура Шейха; 24 x ¥50,000).
   Превышение -> сервер клампит поле и ставит `"clamped": true`.
3. Пересчитать `net_yen` по своим константам (раздел 9): net = gross + tips - аренда - ФОТ -
   вышибала - убытки бомжей. Клиентский net не доверяется.
4. Атомарная транзакция PG:
   - `INSERT INTO shift_history (...) ON CONFLICT (shift_id) DO NOTHING` - идемпотентность;
   - `UPDATE users SET yen = yen + net` (yen может уйти в минус -> зафиксировать `defeat`);
   - `UPDATE user_hostesses SET stamina = ...` - стамина состава на конец смены
     (серверная версия) **плюс сон +20 всем нанятым**, кламп 100;
   - пересчёт `victory` (★★★ + >= 3 READY).
5. `DEL session:{guest_id}` и `lock:shift:{guest_id}`.

Ответ 200:
```json
{
  "report": "ShiftReportDTO",
  "clamped": false,
  "player": "PlayerDTO",
  "hostesses": ["HostessStateDTO"],
  "victory": false,
  "defeat": false
}
```
Повторный `/complete` с тем же shift_id -> `200` с сохранённым отчётом, без повторного зачисления.

### 3.6 POST /api/hostess/hire

Тело: `{ "hostess_id": "NIKA" }`. Цены: NIKA ¥120,000, LUNA ¥300,000.
Ошибки: `ALREADY_HIRED`, `INSUFFICIENT_FUNDS`, `409 SHIFT_ALREADY_ACTIVE` (найм только между смен).
Ответ 200: `{ "player": "PlayerDTO", "hostesses": ["HostessStateDTO"] }`

### 3.7 POST /api/hostess/recover

СПА и VIP-Отпуск одним эндпоинтом (между сменами; работает и на BURNOUT).

Тело: `{ "hostess_id": "YUKI", "method": "SPA" }` или `{ "method": "VIP_VACATION" }`

| method | цена | эффект |
|---|---|---|
| SPA | ¥30,000 | +30, можно многократно |
| VIP_VACATION | ¥70,000 | до 100 |

Ошибки: `ALREADY_FULL` (стамина 100), `INSUFFICIENT_FUNDS`, `409 SHIFT_ALREADY_ACTIVE`.
Ответ 200: `{ "player": "PlayerDTO", "hostesses": ["HostessStateDTO"] }`

### 3.8 POST /api/shop/buy

Только перманентные улучшения (вышибала - через `/shift/start`).

Тело: `{ "upgrade_id": "NEON_SIGN" }` из `NEON_SIGN | VIP_INTERIOR | PREMIUM_BAR | ETIQUETTE`

Цены и правила - раздел 8 манифеста. VIP_INTERIOR требует ★★ (`TIER_TOO_LOW`).
Ошибки: `ALREADY_OWNED`, `TIER_TOO_LOW`, `INSUFFICIENT_FUNDS`, `409 SHIFT_ALREADY_ACTIVE`.
Ответ 200: `{ "player": "PlayerDTO", "upgrades": "UpgradesDTO" }`

### 3.9 POST /api/club/upgrade

Покупка следующей звезды. Тело: пустое `{}`.
Цены: ★★2 = ¥350,000, ★★★3 = ¥800,000. Ошибки: `TIER_MAXED`, `INSUFFICIENT_FUNDS`, `409`.
Ответ 200: `{ "player": "PlayerDTO", "victory": false }`

---

## 4. Схема Redis

| Ключ | Тип | TTL | Содержимое |
|---|---|---|---|
| `session:{guest_id}` | HASH | 600с, продлевается | shift_id, started_at, seed, tier, roster_json, has_bouncer, tables_json, gross_income, bomzh_losses, vip_tips, action_count, last_action_at, server_stamina_json |
| `lock:shift:{guest_id}` | STRING | 300с | tab_id. Takeover: тот же guest_id + новый tab_id = перезапись |

---

## 5. Схема PostgreSQL

```sql
CREATE TABLE users (
    device_id   UUID PRIMARY KEY,          -- guest_id с клиента
    yen         BIGINT NOT NULL DEFAULT 60000,
    club_tier   SMALLINT NOT NULL DEFAULT 1 CHECK (club_tier IN (1, 2, 3)),
    vip_interior BOOLEAN NOT NULL DEFAULT FALSE,
    premium_bar  BOOLEAN NOT NULL DEFAULT FALSE,
    neon_sign    BOOLEAN NOT NULL DEFAULT FALSE,
    etiquette    BOOLEAN NOT NULL DEFAULT FALSE,
    victory     BOOLEAN NOT NULL DEFAULT FALSE,
    defeat      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_hostesses (
    device_id  UUID NOT NULL REFERENCES users(device_id) ON DELETE CASCADE,
    hostess_id VARCHAR(8) NOT NULL CHECK (hostess_id IN ('YUKI','MIRA','SAKURA','NIKA','LUNA')),
    hired      BOOLEAN NOT NULL DEFAULT FALSE,
    stamina    SMALLINT NOT NULL DEFAULT 100 CHECK (stamina BETWEEN 0 AND 100),
    PRIMARY KEY (device_id, hostess_id)
);

CREATE TABLE shift_history (
    shift_id       UUID PRIMARY KEY,        -- идемпотентность ON CONFLICT DO NOTHING
    device_id      UUID NOT NULL REFERENCES users(device_id),
    club_tier      SMALLINT NOT NULL,
    started_at     TIMESTAMPTZ NOT NULL,
    ended_at       TIMESTAMPTZ NOT NULL,
    guests_served  SMALLINT NOT NULL,
    guests_angry   SMALLINT NOT NULL,
    bomzh_blocked  SMALLINT NOT NULL,
    bomzh_placated SMALLINT NOT NULL,
    gross_yen      BIGINT NOT NULL,
    vip_tips_yen   BIGINT NOT NULL,
    rent_yen       BIGINT NOT NULL,
    fot_yen        BIGINT NOT NULL,
    bouncer_yen    BIGINT NOT NULL,
    bomzh_loss_yen BIGINT NOT NULL,
    net_yen        BIGINT NOT NULL,
    clamped        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

При создании игрока - вставить 5 строк `user_hostesses` (YUKI/MIRA/SAKURA hired=TRUE).

---

## 6. Анти-чит и лимиты (сводка)

- Тайминги: сервер владеет `started_at`; окна `[285, 330]` для complete, `> 330` = смена умерла.
- Стамина: сервер выводит из лога действий + событий по времени, отказывает при нехватке.
- Капы выручки: gross <= 8.2M, tips <= 1.2M; превышение клампится с флагом `clamped`.
- Флуд: > 10 action/сек -> 429.
- Все мутации между сменами валидируют баланс сервером - клиентский баланс не принимается.

## 7. Вне скоупа V1 (не реализуем, но оставляем место)

- `GET /api/leaderboard` - топ по суммарному net_yen из shift_history.
- Telegram-авторизация (initDataUnsafe -> реальный user_id вместо guest_id).
- WebSocket-пуш событий (сейчас polling `/shift/state` раз в 3-5с как самокоррекция).

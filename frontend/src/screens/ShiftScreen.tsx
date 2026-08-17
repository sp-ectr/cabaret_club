// src/screens/ShiftScreen.tsx
// Главный экран 5-минутной смены. Строго по стандартам React 19:
// чистый рендер без мутаций рефов, изолированные таймеры и финализация.

import { useEffect, useRef, useState } from "react";
import { api, type HostessState, type PlayerState } from "../api/client";
import { SHIFT_DURATION_SEC, MAJIMA_START_SEC } from "../game/config";
import { createRNG } from "../game/rng";
import {
  applyAssign,
  applyPlacateBomzh,
  createInitialShiftState,
  finalizeShift,
  isHostessBusy,
  shiftTick,
  type ShiftContext,
  type ShiftEngineState,
} from "../game/shiftEngine";
import type { Hostess, HostessId, ShiftReport } from "../game/types";
import { DICTIONARY, type Language } from "../utils/dictionary";

import { TableSlot } from "../components/shift/TableSlot";
import { HostessPicker } from "../components/shift/HostessPicker";
import {
  EventBanner,
  type ActiveEventType,
} from "../components/shift/EventBanner";
import { ShiftSummaryModal } from "../components/modals/ShiftSummaryModal";

interface ShiftScreenProps {
  lang: Language;
  shiftId: string;
  startedAt: number;
  seed: number;
  ctx: ShiftContext;
  /** Стартовый состав смены со свежим runtime stamina с сервера */
  initialHostesses: Hostess[];
  /** Колбэк завершения смены и передачи результатов в главное меню */
  onFinish: (
    report: ShiftReport,
    player?: PlayerState,
    hostesses?: HostessState[],
  ) => void;
}

export function ShiftScreen({
  lang,
  shiftId,
  startedAt,
  seed,
  ctx,
  initialHostesses,
  onFinish,
}: ShiftScreenProps) {
  const t = DICTIONARY[lang];

  // 1. Инициализация чистого состояния игрового движка
  const [engineState, setEngineState] = useState<ShiftEngineState>(() =>
    createInitialShiftState(ctx, initialHostesses, shiftId, startedAt),
  );

  // Детерминированный генератор случайных чисел для смены
  const rngRef = useRef<() => number>(createRNG(seed));

  // Выбранная хостес для посадки за стол
  const [selectedHostessId, setSelectedHostessId] = useState<HostessId | null>(
    null,
  );

  // Состояние завершения смены (для модалки итогов)
  const [completedReport, setCompletedReport] = useState<ShiftReport | null>(
    null,
  );
  const [completedMeta, setCompletedMeta] = useState<{
    player?: PlayerState;
    hostesses?: HostessState[];
  } | null>(null);

  // Реф-замок от повторного вызова completeShift
  const isCompletingRef = useRef<boolean>(false);

  // Флаг окончания смены для управления интервалом
  const isShiftEnded =
    engineState.timeRemainingSec <= 0 || completedReport !== null;

  // 2. Игровой секундный таймер (Pure Game Tick)
  useEffect(() => {
    if (isShiftEnded) return;

    const interval = setInterval(() => {
      setEngineState((prev) => {
        if (prev.timeRemainingSec <= 0) return prev;
        return shiftTick(prev, rngRef.current);
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isShiftEnded]);

  // 3. Завершение смены при достижении 0 секунд (Изолированный сайд-эффект)
  useEffect(() => {
    if (engineState.timeRemainingSec > 0 || isCompletingRef.current) return;
    isCompletingRef.current = true;

    const complete = async () => {
      // Передаем текущий engineState напрямую без рефов!
      const localReport = finalizeShift(engineState);
      try {
        const res = await api.completeShift(shiftId, localReport);
        setCompletedReport(res.report);
        setCompletedMeta({ player: res.player, hostesses: res.hostesses });
      } catch (error) {
        console.warn(
          "Shift complete API error, using local fallback report:",
          error,
        );
        setCompletedReport(localReport);
      }
    };

    void complete();
  }, [engineState.timeRemainingSec, engineState, shiftId]);

  // 4. Обработчик посадки хостес (ASSIGN)
  const handleAssign = (tableId: 1 | 2 | 3, hostessId: HostessId) => {
    const res = applyAssign(engineState, tableId, hostessId);
    if (!res.ok) {
      console.warn("Assign rejected:", res.error);
      return;
    }

    setEngineState(res.state);
    setSelectedHostessId(null);

    // Синхронизация с API
    const assignedTable = res.state.tables.find((t) => t.id === tableId);
    if (assignedTable) {
      api
        .sendAction(
          shiftId,
          {
            type: "ASSIGN",
            tableId,
            hostessId,
            matchMultiplier: assignedTable.matchMultiplier,
            feedback: assignedTable.currentMatchFeedback || "GOOD",
          },
          res.state.tables,
        )
        .catch((err) => console.warn("Failed to sync ASSIGN action:", err));
    }
  };

  // 5. Обработчик успокоения бомжа (PLACATE_BOMZH)
  const handlePlacate = (tableId: 1 | 2 | 3, hostessId: HostessId) => {
    const res = applyPlacateBomzh(engineState, tableId, hostessId);
    if (!res.ok) {
      console.warn("Placate rejected:", res.error);
      return;
    }

    setEngineState(res.state);
    setSelectedHostessId(null);

    // Синхронизация с API
    api
      .sendAction(
        shiftId,
        {
          type: "PLACATE_BOMZH",
          tableId,
          hostessId,
        },
        res.state.tables,
      )
      .catch((err) =>
        console.warn("Failed to sync PLACATE_BOMZH action:", err),
      );
  };

  // 6. Вычисляемый активный баннер (Derived State)
  let activeBanner: ActiveEventType = null;
  let bannerSecRemaining: number | undefined = undefined;

  if (engineState.sheikhAuraRemainingSec > 0) {
    activeBanner = "SHEIKH";
    bannerSecRemaining = engineState.sheikhAuraRemainingSec;
  } else {
    const elapsed = SHIFT_DURATION_SEC - engineState.timeRemainingSec;
    if (
      engineState.eventsTriggered.majima &&
      elapsed >= MAJIMA_START_SEC &&
      elapsed < MAJIMA_START_SEC + 4
    ) {
      activeBanner = "MAJIMA";
    }
  }

  // Список занятых хостес
  const busyHostessIds = engineState.activeHostesses
    .filter((h) => isHostessBusy(engineState, h.id as HostessId))
    .map((h) => h.id as HostessId);

  // Форматирование таймера (MM:SS)
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <main
      className="relative w-full h-dvh bg-[#09050d] text-white flex flex-col justify-between overflow-hidden select-none font-sans"
      style={{
        paddingLeft: "max(8px, env(safe-area-inset-left))",
        paddingRight: "max(8px, env(safe-area-inset-right))",
        paddingTop: "max(4px, env(safe-area-inset-top))",
      }}
    >
      {/* ================= 1. ВСПЛЫВАЮЩИЙ БАННЕР СОБЫТИЙ ================= */}
      <EventBanner
        activeEvent={activeBanner}
        remainingSec={bannerSecRemaining}
        lang={lang}
      />

      {/* ================= 2. ВЕРХНЯЯ ИНФО-ПАНЕЛЬ СМЕНЫ ================= */}
      <header className="relative z-20 w-full max-w-[960px] mx-auto flex items-center justify-between px-3 py-1.5 border-b border-zinc-800/60 bg-black/60 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
          <span className="text-[11px] font-mono font-bold tracking-[0.2em] text-rose-300 uppercase">
            {t.shiftScreen.shiftTitle}
          </span>
        </div>

        <div className="flex items-center gap-2 px-3 py-0.5 border border-zinc-700/80 bg-zinc-950/80">
          <span className="text-xs">⏱</span>
          <span className="text-sm font-mono font-black tracking-widest text-amber-300">
            {formatTime(engineState.timeRemainingSec)}
          </span>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-0.5 border border-emerald-800/60 bg-emerald-950/30">
          <span className="text-[10px] font-mono text-emerald-400 font-bold">
            ¥
          </span>
          <span className="text-xs sm:text-sm font-mono font-bold text-emerald-300 tracking-wider">
            {engineState.grossIncome.toLocaleString()}
          </span>
        </div>
      </header>

      {/* ================= 3. ЦЕНТРАЛЬНАЯ СЕТКА 3 СТОЛОВ ================= */}
      <div className="relative z-10 w-full max-w-[960px] mx-auto flex-1 flex items-center justify-center px-2 sm:px-4 my-auto">
        <div className="w-full grid grid-cols-3 gap-3 sm:gap-4 items-center">
          {engineState.tables.map((table) => (
            <TableSlot
              key={table.id}
              lang={lang}
              table={table}
              selectedHostessId={selectedHostessId}
              sheikhAura={
                engineState.sheikhAuraRemainingSec > 0 && table.id === 1
              }
              onAssign={handleAssign}
              onPlacate={handlePlacate}
              label={
                table.id === 1 && ctx.hasVipInterior ? "VIP 1" : `${table.id}`
              }
            />
          ))}
        </div>
      </div>

      {/* ================= 4. НИЖНЯЯ ПАНЕЛЬ ХОСТЕС ================= */}
      <footer className="relative z-20 w-full max-w-[960px] mx-auto">
        <HostessPicker
          lang={lang}
          activeHostesses={engineState.activeHostesses}
          selectedHostessId={selectedHostessId}
          busyHostessIds={busyHostessIds}
          onSelectHostess={setSelectedHostessId}
        />
      </footer>

      {/* ================= 5. МОДАЛКА БУХГАЛТЕРСКОГО ОТЧЕТА ================= */}
      {completedReport !== null && (
        <ShiftSummaryModal
          lang={lang}
          report={completedReport}
          onContinue={() => {
            onFinish(
              completedReport,
              completedMeta?.player,
              completedMeta?.hostesses,
            );
          }}
        />
      )}
    </main>
  );
}

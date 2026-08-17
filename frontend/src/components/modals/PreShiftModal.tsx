// src/components/modals/PreShiftModal.tsx
// Финальный мост перед сменой: выбор состава, вышибала, калькулятор расходов.
// При успехе отдаёт стартовое состояние смены родителю в ShiftScreen.
// 409 SHIFT_ALREADY_ACTIVE не роняет окно, а уводит в реконнект активной смены.

import { useState } from "react";
import {
  api,
  ApiError,
  type HostessState,
  type PlayerState,
  type ShiftState,
  type StartShiftResponse,
} from "../../api/client";
import {
  HOSTESS_WAGE_PER_SHIFT,
  RENT_BY_TIER,
  UPGRADE_CONFIGS,
  ZERO_STAFF_BANKRUPTCY_THRESHOLD_YEN,
} from "../../game/config";
import { getHostessStatus } from "../../game/economy";
import type { HostessId } from "../../game/types";
import { DICTIONARY, type Language } from "../../utils/dictionary";

import yukiImg from "../../assets/hostesses/yuki.webp";
import miraImg from "../../assets/hostesses/mira.webp";
import sakuraImg from "../../assets/hostesses/sakura.webp";
import nikaImg from "../../assets/hostesses/nika.webp";
import lunaImg from "../../assets/hostesses/luna.webp";
import bouncerImg from "../../assets/club/bouncer.webp";

interface PreShiftModalProps {
  lang: Language;
  player: PlayerState;
  hostesses: HostessState[];
  onClose: () => void;
  /** успешный старт: ответ сервера + выбранный состав и вышибала (нужны экрану смены) */
  onStart: (shift: StartShiftResponse, selectedIds: HostessId[], hasBouncer: boolean) => void;
  /** 409: смена уже идёт (другая вкладка / после F5) - родитель уходит в реконнект */
  onAlreadyActive: (shift: ShiftState) => void;
}

const HOSTESS_IMAGES: Record<HostessId, string> = {
  YUKI: yukiImg,
  MIRA: miraImg,
  SAKURA: sakuraImg,
  NIKA: nikaImg,
  LUNA: lunaImg,
};

export function PreShiftModal({ lang, player, hostesses, onClose, onStart, onAlreadyActive }: PreShiftModalProps) {
  const t = DICTIONARY[lang].preShiftModal;
  const ht = DICTIONARY[lang].hostessModal;

  // Авто-выбор: все дееспособные (READY + TIRED)
  const [selected, setSelected] = useState<Set<HostessId>>(
    () =>
      new Set(
        hostesses
          .filter((h) => h.hired && getHostessStatus(h.stamina) !== "BURNOUT")
          .map((h) => h.id)
      )
  );
  const [hasBouncer, setHasBouncer] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hired = hostesses.filter((h) => h.hired);
  const availableCount = hired.filter((h) => getHostessStatus(h.stamina) !== "BURNOUT").length;
  const zeroStaff = availableCount === 0;
  const bankrupt = zeroStaff && player.yen < ZERO_STAFF_BANKRUPTCY_THRESHOLD_YEN;

  // Калькулятор расходов (раздел 9): аренда + ФОТ + вышибала
  const rent = RENT_BY_TIER[player.clubTier];
  const fot = selected.size * HOSTESS_WAGE_PER_SHIFT;
  const bouncerCost = hasBouncer ? UPGRADE_CONFIGS.BOUNCER.cost : 0;
  const totalExpense = rent + fot + bouncerCost;

  const toggleHostess = (id: HostessId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleStart = async () => {
    if (busy || selected.size === 0) return;
    setError(null);
    setBusy(true);
    try {
      const shift = await api.startShift([...selected], hasBouncer);
      onStart(shift, [...selected], hasBouncer);
    } catch (err) {
      if (err instanceof ApiError && err.code === "SHIFT_ALREADY_ACTIVE") {
        // Смена уже тикает на сервере - бесшовно уводим в неё
        const state = await api.getShiftState();
        if ("shiftId" in state) {
          onAlreadyActive(state);
          return;
        }
        setError("смена уже завершилась - обновите состояние клуба");
        return;
      }
      setError(err instanceof ApiError ? err.message : "нет связи с сервером");
    } finally {
      setBusy(false);
    }
  };

  const statusBadge = (stamina: number) => {
    const status = getHostessStatus(stamina);
    if (status === "READY") return <span className="text-emerald-400">{ht.ready}</span>;
    if (status === "TIRED") return <span className="text-amber-400">{ht.tired} ({ht.tiredHint})</span>;
    return <span className="text-rose-500">{ht.burnout} ({ht.burnoutHint})</span>;
  };

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-5">
      <div className="relative flex flex-col w-full max-w-[760px] max-h-[90dvh] border border-zinc-800 bg-[#0b0710]/95 shadow-[0_0_60px_rgba(0,0,0,0.9)]">

        {/* Шапка: фиксирована сверху, скролл её не трогает */}
        <div className="flex justify-between items-center px-4 py-2 border-b border-zinc-800/80 bg-[#0b0710] shrink-0">
          <h2 className="text-sm font-mono tracking-[0.3em] text-rose-300 uppercase drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]">
            {t.title}
          </h2>
          <button
            onClick={onClose}
            aria-label="close"
            className="h-8 px-2.5 flex items-center justify-center border border-zinc-700 text-zinc-300 hover:border-rose-500/60 hover:text-rose-300 transition-colors text-sm font-mono whitespace-nowrap cursor-pointer"
          >
            [ X ]
          </button>
        </div>

        {/* Контент: скроллится только эта зона */}
        <div className="overflow-y-auto min-h-0">

        <div className="grid grid-cols-1 md:grid-cols-[1fr_240px] gap-3 p-3">
          {/* Левая колонка: состав смены */}
          <div className="flex flex-col gap-1.5">
            {hired.map((h) => {
              const isBurnout = getHostessStatus(h.stamina) === "BURNOUT";
              const isSelected = selected.has(h.id);
              return (
                <button
                  key={h.id}
                  onClick={() => !isBurnout && toggleHostess(h.id)}
                  disabled={isBurnout}
                  className={`
                    flex items-center gap-3 px-2.5 py-2 border text-left transition-all
                    ${isBurnout
                      ? "border-rose-900/60 bg-rose-950/20 cursor-not-allowed opacity-70"
                      : isSelected
                        ? "border-rose-500/60 bg-rose-950/30 cursor-pointer"
                        : "border-zinc-800 bg-black/50 hover:border-zinc-700 cursor-pointer"}
                  `}
                >
                  {/* Квадратный чекбокс без округлений */}
                  <span
                    className={`w-4 h-4 shrink-0 flex items-center justify-center border text-[10px] font-mono font-bold
                      ${isBurnout
                        ? "border-rose-800 text-rose-800"
                        : isSelected
                          ? "border-rose-400 bg-rose-500/80 text-white"
                          : "border-zinc-600 text-transparent"}
                    `}
                  >
                    {isBurnout ? "×" : "✓"}
                  </span>

                  <img src={HOSTESS_IMAGES[h.id]} alt={h.id} draggable={false} className="w-14 h-14 object-cover border border-zinc-700/60" />

                  <span className="text-[10px] font-bold text-zinc-100 tracking-wider uppercase w-14 shrink-0">{h.id}</span>

                  <span className="text-[8px] font-mono tracking-wider flex-1">{statusBadge(h.stamina)}</span>

                  {isBurnout ? (
                    <span className="text-[7px] font-mono tracking-[0.15em] text-rose-400 border border-rose-500/40 px-1.5 py-0.5 whitespace-nowrap">
                      {t.burnoutPlate}
                    </span>
                  ) : isSelected ? (
                    <span className="text-[7px] font-mono tracking-[0.15em] text-rose-300/70 whitespace-nowrap">{t.inRoster}</span>
                  ) : null}
                </button>
              );
            })}

            {selected.size === 0 && !zeroStaff && (
              <div className="border border-amber-500/40 bg-amber-950/20 px-3 py-1.5 text-[9px] font-mono text-amber-300 tracking-wider">
                {t.needOne}
              </div>
            )}
          </div>

          {/* Правая колонка: вышибала + бюджет + старт */}
          <div className="flex flex-col gap-2">
            {/* Вышибала: карточка с аватаром */}
            <button
              onClick={() => setHasBouncer((v) => !v)}
              className={`flex items-center gap-3 px-2.5 py-2 border text-left transition-all cursor-pointer
                ${hasBouncer ? "border-cyan-500/60 bg-cyan-950/25" : "border-zinc-800 bg-black/50 hover:border-zinc-700"}
              `}
            >
              <span
                className={`w-5 h-5 shrink-0 flex items-center justify-center border text-xs font-mono font-bold
                  ${hasBouncer ? "border-cyan-400 bg-cyan-500/80 text-white" : "border-zinc-600 text-transparent"}
                `}
              >
                ✓
              </span>
              <img
                src={bouncerImg}
                alt="Bouncer"
                draggable={false}
                className={`w-16 h-16 object-cover border border-cyan-500/40 ${hasBouncer ? "" : "opacity-60"}`}
              />
              <span className="flex flex-col gap-1 min-w-0">
                <span className="text-[11px] font-black text-cyan-200 tracking-wider uppercase">
                  {t.bouncerLabel}
                </span>
                <span className="text-[9px] leading-snug text-zinc-400">{t.bouncerDesc}</span>
                <span className="text-sm font-mono font-bold text-cyan-300">
                  ¥{(UPGRADE_CONFIGS.BOUNCER.cost / 1000).toFixed(0)}k
                </span>
              </span>
            </button>

            {/* Калькулятор расходов */}
            <div className="border border-zinc-800 bg-black/50 px-3 py-2 flex flex-col gap-1">
              <div className="flex justify-between text-[9px] font-mono text-zinc-400">
                <span>{t.balanceLabel}</span>
                <span className="text-amber-300 font-bold">¥ {player.yen.toLocaleString()}</span>
              </div>
              <div className="h-px bg-zinc-800/80 my-0.5" />
              <div className="flex justify-between text-[9px] font-mono text-zinc-400">
                <span>{t.rentLabel}</span>
                <span className="text-rose-400">−¥{rent.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-[9px] font-mono text-zinc-400">
                <span>{t.fotLabel} ×{selected.size}</span>
                <span className="text-rose-400">−¥{fot.toLocaleString()}</span>
              </div>
              {hasBouncer && (
                <div className="flex justify-between text-[9px] font-mono text-zinc-400">
                  <span>{t.bouncerLine}</span>
                  <span className="text-rose-400">−¥{bouncerCost.toLocaleString()}</span>
                </div>
              )}
              <div className="h-px bg-zinc-800/80 my-0.5" />
              <div className="flex justify-between text-[10px] font-mono font-bold">
                <span className="text-zinc-300 tracking-wider">{t.totalLabel}</span>
                <span className="text-rose-300">−¥{totalExpense.toLocaleString()}</span>
              </div>
              <span className="text-[7px] font-mono text-zinc-600 tracking-[0.12em] uppercase">{t.expenseNote}</span>
            </div>

            {/* Старт или блокировки Zero-Staff */}
            {zeroStaff ? (
              bankrupt ? (
                <div className="border border-rose-500/60 bg-rose-950/40 px-3 py-3 text-center text-[10px] font-mono font-bold text-rose-300 tracking-[0.15em]">
                  {t.bankruptcy}
                </div>
              ) : (
                <div className="border border-amber-500/50 bg-amber-950/25 px-3 py-3 text-center text-[10px] font-mono font-bold text-amber-300 tracking-[0.15em]">
                  {t.zeroStaff}
                </div>
              )
            ) : (
              <button
                onClick={handleStart}
                disabled={busy || selected.size === 0}
                className={`
                  min-h-[44px] w-full text-[11px] font-black font-sans tracking-[0.2em] uppercase border transition-all
                  ${selected.size > 0
                    ? "border-rose-500/70 bg-gradient-to-r from-rose-950/70 to-black text-rose-100 hover:border-rose-400 hover:from-rose-900/80 active:scale-[0.98] cursor-pointer shadow-[0_0_25px_rgba(244,63,94,0.35)]"
                    : "border-zinc-800 text-zinc-600 cursor-not-allowed"}
                `}
              >
                {busy ? "···" : `${t.start} >>>`}
              </button>
            )}
          </div>
        </div>

        {/* Строка ошибки */}
        {error && (
          <div className="mx-3 mb-3 border border-rose-500/40 bg-rose-950/30 px-3 py-1.5 text-[10px] font-mono text-rose-300">
            {error}
          </div>
        )}

        </div>
      </div>
    </div>
  );
}

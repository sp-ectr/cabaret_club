// src/components/modals/HostessModal.tsx
// Окно «ХОСТЕС // РОСТЕР»: карточки-портреты по игровому референсу -
// аватар занимает почти всю карточку, текст крупный, кнопки горят.
// Мерж: динамика (hired, задор) из API, статика (статы, редкость, цены) из config.

import { useState } from "react";
import {
  api,
  ApiError,
  type HostessState,
  type PlayerState,
} from "../../api/client";
import {
  INITIAL_HOSTESSES,
  SPA_COST,
  STAMINA_MAX,
  VIP_VACATION_COST,
} from "../../game/config";
import { getHostessStatus } from "../../game/economy";
import type { Hostess, HostessId, HostessStatus } from "../../game/types";
import { DICTIONARY, type Language } from "../../utils/dictionary";

import yukiImg from "../../assets/hostesses/yuki.webp";
import miraImg from "../../assets/hostesses/mira.webp";
import sakuraImg from "../../assets/hostesses/sakura.webp";
import nikaImg from "../../assets/hostesses/nika.webp";
import lunaImg from "../../assets/hostesses/luna.webp";

interface HostessModalProps {
  lang: Language;
  player: PlayerState;
  hostesses: HostessState[];
  onClose: () => void;
  /** после успешной мутации - родитель обновляет состояние */
  onChanged: () => void;
}

const HOSTESS_IMAGES: Record<HostessId, string> = {
  YUKI: yukiImg,
  MIRA: miraImg,
  SAKURA: sakuraImg,
  NIKA: nikaImg,
  LUNA: lunaImg,
};

// Рамки и бейджи редкости
const RARITY_BORDERS: Record<Hostess["rarity"], string> = {
  SSR: "border-amber-500/60 shadow-[0_0_20px_rgba(251,191,36,0.15)]",
  SR: "border-fuchsia-500/60 shadow-[0_0_20px_rgba(217,70,239,0.15)]",
  R: "border-cyan-500/60 shadow-[0_0_20px_rgba(34,211,238,0.15)]",
};

const RARITY_TEXT: Record<Hostess["rarity"], string> = {
  SSR: "text-amber-300",
  SR: "text-fuchsia-300",
  R: "text-cyan-300",
};

// Цвета статусов и полосы задора
const STATUS_STYLES: Record<HostessStatus, { text: string; badge: string; bar: string }> = {
  READY: {
    text: "text-emerald-400",
    badge: "border-emerald-500/70 text-emerald-300",
    bar: "bg-gradient-to-r from-emerald-600 to-emerald-400",
  },
  TIRED: {
    text: "text-amber-400",
    badge: "border-amber-500/70 text-amber-300",
    bar: "bg-gradient-to-r from-amber-600 to-amber-400",
  },
  BURNOUT: {
    text: "text-rose-500",
    badge: "border-rose-500/70 text-rose-400",
    bar: "bg-gradient-to-r from-rose-700 to-rose-500",
  },
};

export function HostessModal({ lang, player, hostesses, onClose, onChanged }: HostessModalProps) {
  const t = DICTIONARY[lang].hostessModal;

  // Локальные копии для мгновенного отклика, родитель синхронизируется через onChanged
  const [yen, setYen] = useState(player.yen);
  const [roster, setRoster] = useState<Record<HostessId, HostessState>>(() =>
    Object.fromEntries(hostesses.map((h) => [h.id, h])) as Record<HostessId, HostessState>
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runMutation = async (key: string, action: () => Promise<void>) => {
    if (busy) return;
    setError(null);
    setBusy(key);
    try {
      await action();
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "нет связи с сервером");
    } finally {
      setBusy(null);
    }
  };

  const applyResponse = (res: { player: PlayerState; hostesses: HostessState[] }) => {
    setYen(res.player.yen);
    setRoster(Object.fromEntries(res.hostesses.map((h) => [h.id, h])) as Record<HostessId, HostessState>);
  };

  const handleHire = (id: HostessId) =>
    runMutation(`${id}:HIRE`, async () => applyResponse(await api.hireHostess(id)));

  const handleRecover = (id: HostessId, method: "SPA" | "VIP_VACATION") =>
    runMutation(`${id}:${method}`, async () => applyResponse(await api.recoverHostess(id, method)));

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 sm:p-5">
      <div className="relative flex flex-col w-full max-w-[1080px] max-h-[92dvh] border border-zinc-800 bg-[#0b0710]/95 shadow-[0_0_60px_rgba(0,0,0,0.9)]">

        {/* Шапка: фиксирована сверху, скролл её не трогает */}
        <div className="flex justify-between items-center px-4 py-2.5 border-b border-zinc-800/80 bg-[#0b0710] shrink-0">
          <h2 className="text-sm font-mono tracking-[0.3em] text-rose-300 uppercase drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]">
            {t.title}
          </h2>
          <div className="flex items-center gap-4">
            <span className="text-sm font-mono font-bold text-amber-300">¥ {yen.toLocaleString()}</span>
            <button
              onClick={onClose}
              aria-label="close"
              className="h-8 px-2.5 flex items-center justify-center border border-zinc-700 text-zinc-300 hover:border-rose-500/60 hover:text-rose-300 transition-colors text-sm font-mono whitespace-nowrap cursor-pointer"
            >
              [ X ]
            </button>
          </div>
        </div>

        {/* Контент: скроллится только эта зона */}
        <div className="overflow-y-auto min-h-0">

        {/* Ростер: портретные карточки, аватар почти во всю карточку */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 p-3">
          {INITIAL_HOSTESSES.map((staticData) => {
            const state = roster[staticData.id];
            if (!state) return null;

            const status = getHostessStatus(state.stamina);
            const styles = STATUS_STYLES[status];
            const hireCost = staticData.hireCost ?? 0;
            const isFull = state.stamina >= STAMINA_MAX;
            const busyKey = busy;

            return (
              <div
                key={staticData.id}
                className={`flex flex-col border bg-black/60 overflow-hidden
                  ${RARITY_BORDERS[staticData.rarity]} ${!state.hired ? "opacity-80" : ""}`}
              >
                {/* Портрет во всю ширину, квадрат */}
                <div className="relative">
                  <img
                    src={HOSTESS_IMAGES[staticData.id]}
                    alt={staticData.name}
                    draggable={false}
                    className={`w-full aspect-square object-cover ${state.hired ? "" : "grayscale"}`}
                  />

                  {/* Редкость - крупный бейдж слева сверху */}
                  <span className={`absolute top-1.5 left-1.5 text-xs font-black tracking-[0.15em] px-2 py-0.5 bg-black/80 border ${RARITY_TEXT[staticData.rarity]} border-current/40`}>
                    {staticData.rarity}
                  </span>

                  {/* Статус - бейдж справа сверху */}
                  <span className={`absolute top-1.5 right-1.5 text-[10px] font-mono font-bold px-2 py-0.5 bg-black/80 border ${styles.badge}`}>
                    {status === "READY" ? t.ready : status === "TIRED" ? t.tired : t.burnout}
                  </span>
                </div>

                {/* Имя */}
                <div className="text-center py-1.5 border-b border-zinc-800/80">
                  <span className="text-base font-black text-zinc-100 tracking-[0.15em] uppercase">
                    {staticData.name}
                  </span>
                </div>

                {/* Статы: крупная строка из трёх */}
                <div className="grid grid-cols-3 border-b border-zinc-800/80">
                  <div className="flex flex-col items-center gap-0.5 py-1.5 border-r border-zinc-800/60">
                    <span className="text-sm leading-none">💬</span>
                    <span className="text-sm font-mono font-bold text-zinc-100">{staticData.stats.talk}</span>
                    <span className="text-[9px] font-mono text-zinc-500 tracking-[0.1em]">{t.stats.talk}</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5 py-1.5 border-r border-zinc-800/60">
                    <span className="text-sm leading-none">🍸</span>
                    <span className="text-sm font-mono font-bold text-zinc-100">{staticData.stats.charisma}</span>
                    <span className="text-[9px] font-mono text-zinc-500 tracking-[0.1em]">{t.stats.charisma}</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5 py-1.5">
                    <span className="text-sm leading-none">💖</span>
                    <span className="text-sm font-mono font-bold text-zinc-100">{staticData.stats.service}</span>
                    <span className="text-[9px] font-mono text-zinc-500 tracking-[0.1em]">{t.stats.service}</span>
                  </div>
                </div>

                {/* Задор */}
                <div className="flex flex-col gap-1 px-2 py-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono tracking-[0.15em] text-zinc-400 uppercase">
                      {t.staminaLabel}
                    </span>
                    <span className={`text-xs font-mono font-bold ${styles.text}`}>
                      {state.stamina}/100
                      {status === "TIRED" && <span className="text-zinc-500"> · {t.tiredHint}</span>}
                      {status === "BURNOUT" && <span> · {t.burnoutHint}</span>}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-zinc-800/80">
                    <div className={`h-full ${styles.bar}`} style={{ width: `${state.stamina}%` }} />
                  </div>
                </div>

                {/* Кнопки */}
                <div className="p-2 pt-0 mt-auto">
                  {!state.hired ? (
                    <button
                      onClick={() => handleHire(staticData.id)}
                      disabled={busy !== null || yen < hireCost}
                      className={`
                        min-h-[40px] w-full text-xs font-mono font-black tracking-[0.2em] uppercase border transition-all
                        ${yen >= hireCost
                          ? "border-cyan-400/70 text-cyan-100 bg-cyan-950/40 hover:bg-cyan-900/60 hover:shadow-[0_0_20px_rgba(34,211,238,0.35)] active:scale-95 cursor-pointer"
                          : "border-zinc-800 text-zinc-600 cursor-not-allowed"}
                      `}
                    >
                      {busyKey === `${staticData.id}:HIRE` ? "···" : `${t.hire} · ¥${(hireCost / 1000).toFixed(0)}k`}
                    </button>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      <button
                        onClick={() => handleRecover(staticData.id, "SPA")}
                        disabled={busy !== null || isFull || yen < SPA_COST}
                        className={`
                          min-h-[32px] w-full text-[11px] font-mono font-bold tracking-[0.15em] uppercase border transition-all
                          ${!isFull && yen >= SPA_COST
                            ? "border-emerald-500/60 text-emerald-200 bg-emerald-950/30 hover:bg-emerald-900/50 active:scale-95 cursor-pointer"
                            : "border-zinc-800 text-zinc-600 cursor-not-allowed"}
                        `}
                      >
                        {busyKey === `${staticData.id}:SPA` ? "···" : `${t.spa} · ¥${(SPA_COST / 1000).toFixed(0)}k`}
                      </button>
                      <button
                        onClick={() => handleRecover(staticData.id, "VIP_VACATION")}
                        disabled={busy !== null || isFull || yen < VIP_VACATION_COST}
                        className={`
                          min-h-[32px] w-full text-[11px] font-mono font-bold tracking-[0.15em] uppercase border transition-all
                          ${!isFull && yen >= VIP_VACATION_COST
                            ? "border-amber-500/60 text-amber-200 bg-amber-950/30 hover:bg-amber-900/50 active:scale-95 cursor-pointer"
                            : "border-zinc-800 text-zinc-600 cursor-not-allowed"}
                        `}
                      >
                        {busyKey === `${staticData.id}:VIP_VACATION` ? "···" : `${t.vacation} · ¥${(VIP_VACATION_COST / 1000).toFixed(0)}k`}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Строка ошибки */}
        {error && (
          <div className="mx-3 mb-3 border border-rose-500/40 bg-rose-950/30 px-3 py-2 text-xs font-mono text-rose-300">
            {error}
          </div>
        )}

        </div>
      </div>
    </div>
  );
}

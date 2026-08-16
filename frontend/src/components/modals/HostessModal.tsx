// src/components/modals/HostessModal.tsx
// Окно «ХОСТЕС // РОСТЕР»: карточки девушек, найм и восстановление.
// Мерж: динамика (hired, задор) приходит из API, статика (статы, редкость,
// цены) - из INITIAL_HOSTESSES в config.ts. Аватарки - статические ассеты.

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

// Рамки редкости
const RARITY_BORDERS: Record<Hostess["rarity"], string> = {
  SSR: "border-amber-500/50",
  SR: "border-fuchsia-500/50",
  R: "border-cyan-500/50",
};

const RARITY_TEXT: Record<Hostess["rarity"], string> = {
  SSR: "text-amber-300",
  SR: "text-fuchsia-300",
  R: "text-cyan-300",
};

// Цвета статусов и полосы задора
const STATUS_STYLES: Record<HostessStatus, { text: string; bar: string }> = {
  READY: { text: "text-emerald-400", bar: "bg-gradient-to-r from-emerald-600 to-emerald-400" },
  TIRED: { text: "text-amber-400", bar: "bg-gradient-to-r from-amber-600 to-amber-400" },
  BURNOUT: { text: "text-rose-500", bar: "bg-gradient-to-r from-rose-700 to-rose-500" },
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
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-5">
      <div className="relative w-full max-w-[960px] max-h-[90dvh] overflow-y-auto border border-zinc-800 bg-[#0b0710]/95 shadow-[0_0_60px_rgba(0,0,0,0.9)]">

        {/* Шапка */}
        <div className="sticky top-0 z-10 flex justify-between items-center px-4 py-2 border-b border-zinc-800/80 bg-[#0b0710]">
          <h2 className="text-xs font-mono tracking-[0.3em] text-rose-300 uppercase drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]">
            {t.title}
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono font-bold text-amber-300">¥ {yen.toLocaleString()}</span>
            <button
              onClick={onClose}
              aria-label="close"
              className="w-7 h-7 flex items-center justify-center border border-zinc-700 text-zinc-400 hover:border-rose-500/60 hover:text-rose-300 transition-colors text-xs font-mono cursor-pointer"
            >
              [ X ]
            </button>
          </div>
        </div>

        {/* Ростер */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2 p-3">
          {INITIAL_HOSTESSES.map((staticData) => {
            const state = roster[staticData.id];
            if (!state) return null;

            const status = getHostessStatus(state.stamina);
            const styles = STATUS_STYLES[status];
            const hireCost = staticData.hireCost ?? 0;
            const isFull = state.stamina >= STAMINA_MAX;
            const busyKey = busy;
            const cardBusy = busyKey?.startsWith(`${staticData.id}:`) ?? false;

            return (
              <div
                key={staticData.id}
                className={`flex flex-col gap-1.5 p-2 border bg-black/50
                  ${RARITY_BORDERS[staticData.rarity]} ${!state.hired ? "opacity-70" : ""}`}
              >
                {/* Аватар + имя + редкость */}
                <div className="flex items-center gap-2">
                  <img
                    src={HOSTESS_IMAGES[staticData.id]}
                    alt={staticData.name}
                    draggable={false}
                    className={`w-10 h-10 object-cover border border-zinc-700/60 ${state.hired ? "" : "grayscale"}`}
                  />
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-[10px] font-bold text-zinc-100 tracking-wider uppercase truncate">
                      {staticData.name}
                    </span>
                    <span className={`text-[8px] font-mono font-bold tracking-[0.2em] ${RARITY_TEXT[staticData.rarity]}`}>
                      {staticData.rarity}
                    </span>
                  </div>
                </div>

                {/* Статы */}
                <div className="grid grid-cols-3 gap-1">
                  <div className="flex flex-col items-center border border-zinc-800/70 py-1">
                    <span className="text-[9px] leading-none">💬</span>
                    <span className="text-[9px] font-mono font-bold text-zinc-200 leading-tight">{staticData.stats.talk}</span>
                  </div>
                  <div className="flex flex-col items-center border border-zinc-800/70 py-1">
                    <span className="text-[9px] leading-none">🍸</span>
                    <span className="text-[9px] font-mono font-bold text-zinc-200 leading-tight">{staticData.stats.charisma}</span>
                  </div>
                  <div className="flex flex-col items-center border border-zinc-800/70 py-1">
                    <span className="text-[9px] leading-none">💖</span>
                    <span className="text-[9px] font-mono font-bold text-zinc-200 leading-tight">{staticData.stats.service}</span>
                  </div>
                </div>

                {/* Задор + статус */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[7px] font-mono tracking-[0.2em] text-zinc-500 uppercase">
                      {t.staminaLabel} {state.stamina}/100
                    </span>
                    <span className={`text-[8px] font-mono font-bold tracking-wider ${styles.text}`}>
                      {status === "READY" ? t.ready : status === "TIRED" ? `${t.tired} (${t.tiredHint})` : `${t.burnout} (${t.burnoutHint})`}
                    </span>
                  </div>
                  <div className="w-full h-1 bg-zinc-800/80">
                    <div className={`h-full ${styles.bar}`} style={{ width: `${state.stamina}%` }} />
                  </div>
                </div>

                {/* Кнопки */}
                {!state.hired ? (
                  <button
                    onClick={() => handleHire(staticData.id)}
                    disabled={busy !== null || yen < hireCost}
                    className={`
                      min-h-[30px] w-full text-[9px] font-mono font-bold tracking-[0.15em] uppercase border transition-all
                      ${yen >= hireCost
                        ? "border-cyan-500/50 text-cyan-100 bg-cyan-950/30 hover:border-cyan-400 hover:bg-cyan-900/40 active:scale-95 cursor-pointer"
                        : "border-zinc-800 text-zinc-600 cursor-not-allowed"}
                    `}
                  >
                    {cardBusy ? "···" : `${t.hire} · ¥${hireCost.toLocaleString()}`}
                  </button>
                ) : (
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => handleRecover(staticData.id, "SPA")}
                      disabled={busy !== null || isFull || yen < SPA_COST}
                      className={`
                        min-h-[26px] w-full text-[8px] font-mono font-bold tracking-[0.12em] uppercase border transition-all
                        ${!isFull && yen >= SPA_COST
                          ? "border-emerald-600/50 text-emerald-200 bg-emerald-950/25 hover:border-emerald-500 hover:bg-emerald-900/40 active:scale-95 cursor-pointer"
                          : "border-zinc-800 text-zinc-600 cursor-not-allowed"}
                      `}
                    >
                      {busyKey === `${staticData.id}:SPA` ? "···" : `${t.spa} · ¥${SPA_COST.toLocaleString()}`}
                    </button>
                    <button
                      onClick={() => handleRecover(staticData.id, "VIP_VACATION")}
                      disabled={busy !== null || isFull || yen < VIP_VACATION_COST}
                      className={`
                        min-h-[26px] w-full text-[8px] font-mono font-bold tracking-[0.12em] uppercase border transition-all
                        ${!isFull && yen >= VIP_VACATION_COST
                          ? "border-amber-500/50 text-amber-200 bg-amber-950/25 hover:border-amber-400 hover:bg-amber-900/40 active:scale-95 cursor-pointer"
                          : "border-zinc-800 text-zinc-600 cursor-not-allowed"}
                      `}
                    >
                      {busyKey === `${staticData.id}:VIP_VACATION` ? "···" : `${t.vacation} · ¥${VIP_VACATION_COST.toLocaleString()}`}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Строка ошибки */}
        {error && (
          <div className="mx-3 mb-3 border border-rose-500/40 bg-rose-950/30 px-3 py-1.5 text-[10px] font-mono text-rose-300">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

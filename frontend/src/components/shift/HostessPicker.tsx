import { INITIAL_HOSTESSES } from "../../game/config";
import { getHostessStatus } from "../../game/economy";
import type { Hostess, HostessId, HostessStatus } from "../../game/types";
import { DICTIONARY, type Language } from "../../utils/dictionary";

import yukiImg from "../../assets/hostesses/yuki.webp";
import miraImg from "../../assets/hostesses/mira.webp";
import sakuraImg from "../../assets/hostesses/sakura.webp";
import nikaImg from "../../assets/hostesses/nika.webp";
import lunaImg from "../../assets/hostesses/luna.webp";

const HOSTESS_IMAGES: Record<HostessId, string> = {
  YUKI: yukiImg,
  MIRA: miraImg,
  SAKURA: sakuraImg,
  NIKA: nikaImg,
  LUNA: lunaImg,
};

const STATUS_CONFIG: Record<HostessStatus, { text: string; bar: string }> = {
  READY: { text: "text-emerald-400", bar: "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]" },
  TIRED: { text: "text-amber-400", bar: "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.8)]" },
  BURNOUT: { text: "text-rose-500", bar: "bg-rose-600 shadow-[0_0_6px_rgba(244,63,94,0.9)]" },
};

interface HostessPickerProps {
  lang: Language;
  activeHostesses: Hostess[];
  selectedHostessId: HostessId | null;
  busyHostessIds: HostessId[];
  onSelectHostess: (hostessId: HostessId | null) => void;
}

export function HostessPicker({
  lang,
  activeHostesses,
  selectedHostessId,
  busyHostessIds,
  onSelectHostess,
}: HostessPickerProps) {
  const t = DICTIONARY[lang];

  return (
    <div className="w-full flex items-center justify-center gap-2.5 sm:gap-4 px-3 py-2 bg-black/85 border-t border-zinc-800/90 backdrop-blur-md select-none overflow-x-auto">
      {activeHostesses.map((runtimeHostess) => {
        const staticData = INITIAL_HOSTESSES.find((h) => h.id === runtimeHostess.id);
        if (!staticData) return null;

        const status = getHostessStatus(runtimeHostess.stamina);
        const statusUi = STATUS_CONFIG[status];
        const isBusy = busyHostessIds.includes(runtimeHostess.id);
        const isSelected = selectedHostessId === runtimeHostess.id;
        const isSelectable = !isBusy && status !== "BURNOUT";

        const statusLabel = isBusy
          ? "BUSY"
          : status === "READY"
            ? t.hostessModal.ready
            : status === "TIRED"
              ? `${t.hostessModal.tired} (-20%)`
              : t.hostessModal.burnout;

        return (
          <div
            key={runtimeHostess.id}
            onClick={() => {
              if (!isSelectable) return;
              onSelectHostess(isSelected ? null : runtimeHostess.id);
            }}
            className={`
              relative flex items-center gap-3 p-2 sm:p-2.5 rounded-xs border transition-all duration-200 min-w-[160px] sm:min-w-[185px]
              ${
                isSelected
                  ? "border-2 border-rose-400 bg-rose-950/50 shadow-[0_0_20px_rgba(244,63,94,0.6)] animate-cabaretPulse cursor-pointer scale-102"
                  : isSelectable
                    ? "border-zinc-800 bg-[#0d0914] hover:border-zinc-600 hover:bg-[#140e1f] cursor-pointer shadow-[0_0_10px_rgba(0,0,0,0.8)]"
                    : "border-zinc-900 bg-black/50 opacity-40 cursor-not-allowed"
              }
            `}
          >
            {/* Крупный портрет хостес */}
            <div className="relative shrink-0">
              <img
                src={HOSTESS_IMAGES[runtimeHostess.id]}
                alt={staticData.name}
                draggable={false}
                className="w-13 h-13 sm:w-15 sm:h-15 object-cover rounded-xs border-2 border-zinc-700/80 shadow-[0_0_10px_rgba(0,0,0,0.8)]"
              />
              {isSelected && (
                <span className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-rose-500 rounded-full border-2 border-white shadow-[0_0_10px_rgba(244,63,94,1)] animate-ping" />
              )}
            </div>

            {/* Информационный блок */}
            <div className="flex flex-col flex-1 min-w-0 leading-tight">
              
              {/* Верхняя строка: Имя + Статус */}
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <span className="text-xs sm:text-sm font-black font-sans text-zinc-100 uppercase tracking-wider truncate">
                  {staticData.name}
                </span>
                <span className={`text-[8px] sm:text-[9px] font-mono font-bold tracking-widest uppercase ${statusUi.text}`}>
                  {statusLabel}
                </span>
              </div>

              {/* Крупные плашки характеристик */}
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className="flex items-center gap-0.5 bg-black/80 border border-zinc-700/80 px-1 py-0.5 rounded-none">
                  <span className="text-[9px]">💬</span>
                  <span className="text-[10px] sm:text-xs font-mono font-black text-zinc-200">
                    {staticData.stats.talk}
                  </span>
                </div>
                <div className="flex items-center gap-0.5 bg-black/80 border border-zinc-700/80 px-1 py-0.5 rounded-none">
                  <span className="text-[9px]">🍸</span>
                  <span className="text-[10px] sm:text-xs font-mono font-black text-zinc-200">
                    {staticData.stats.charisma}
                  </span>
                </div>
                <div className="flex items-center gap-0.5 bg-black/80 border border-zinc-700/80 px-1 py-0.5 rounded-none">
                  <span className="text-[9px]">💖</span>
                  <span className="text-[10px] sm:text-xs font-mono font-black text-zinc-200">
                    {staticData.stats.service}
                  </span>
                </div>
              </div>

              {/* Увеличенная полоска Задора */}
              <div className="w-full flex flex-col gap-0.5">
                <div className="w-full h-1.5 sm:h-2 bg-zinc-900 border border-zinc-800 rounded-none overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${statusUi.bar}`}
                    style={{ width: `${Math.max(0, Math.min(100, runtimeHostess.stamina))}%` }}
                  />
                </div>
              </div>

            </div>

            {/* Оверлей занятости [ ЗАНЯТА ] */}
            {isBusy && (
              <div className="absolute inset-0 bg-black/80 flex items-center justify-center rounded-xs backdrop-blur-[1px] z-10 border border-zinc-700/50">
                <span className="text-[10px] sm:text-xs font-mono font-black tracking-[0.2em] text-zinc-300 uppercase drop-shadow-[0_0_8px_rgba(0,0,0,1)]">
                  {t.shiftScreen.busyHostess}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
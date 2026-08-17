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
  READY: { text: "text-emerald-400", bar: "bg-emerald-500" },
  TIRED: { text: "text-amber-400", bar: "bg-amber-500" },
  BURNOUT: { text: "text-rose-500", bar: "bg-rose-600" },
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
    <div className="w-full flex items-center justify-center gap-1.5 sm:gap-2.5 px-2 py-1 bg-black/85 border-t border-zinc-800/80 backdrop-blur-md select-none shrink-0">
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
              ? `${t.hostessModal.tired} (${t.hostessModal.tiredHint})`
              : t.hostessModal.burnout;

        return (
          <div
            key={runtimeHostess.id}
            onClick={() => {
              if (!isSelectable) return;
              onSelectHostess(isSelected ? null : runtimeHostess.id);
            }}
            className={`
              relative flex items-center gap-1.5 px-1.5 py-1 rounded-xs border transition-all duration-200 min-w-[105px] sm:min-w-[130px]
              ${
                isSelected
                  ? "border-rose-400 bg-rose-950/40 shadow-[0_0_12px_rgba(244,63,94,0.4)] animate-cabaretPulse cursor-pointer scale-102"
                  : isSelectable
                    ? "border-zinc-800 bg-black/60 hover:border-zinc-700 cursor-pointer"
                    : "border-zinc-900 bg-black/40 opacity-40 cursor-not-allowed"
              }
            `}
          >
            {/* Аватарка */}
            <div className="relative shrink-0">
              <img
                src={HOSTESS_IMAGES[runtimeHostess.id]}
                alt={staticData.name}
                draggable={false}
                className="w-7 h-7 sm:w-8 sm:h-8 object-cover rounded-xs border border-zinc-700"
              />
              {isSelected && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full shadow-[0_0_6px_rgba(244,63,94,1)]" />
              )}
            </div>

            {/* Инфо-блок */}
            <div className="flex flex-col flex-1 min-w-0 leading-none">
              <div className="flex items-center justify-between gap-1 mb-0.5">
                <span className="text-[9px] sm:text-[10px] font-bold font-sans text-zinc-100 uppercase truncate">
                  {staticData.name}
                </span>
                <span className={`text-[6px] sm:text-[7px] font-mono font-bold tracking-wider ${statusUi.text}`}>
                  {statusLabel}
                </span>
              </div>

              {/* Мини-статы */}
              <div className="flex items-center gap-1 text-[7px] sm:text-[8px] font-mono text-zinc-400 mb-0.5">
                <span>💬{staticData.stats.talk}</span>
                <span>🍸{staticData.stats.charisma}</span>
                <span>💖{staticData.stats.service}</span>
              </div>

              {/* Полоска Задора */}
              <div className="w-full h-1 bg-zinc-800 rounded-none overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${statusUi.bar}`}
                  style={{ width: `${Math.max(0, Math.min(100, runtimeHostess.stamina))}%` }}
                />
              </div>
            </div>

            {/* Оверлей занятости */}
            {isBusy && (
              <div className="absolute inset-0 bg-black/75 flex items-center justify-center rounded-xs backdrop-blur-[0.5px]">
                <span className="text-[7px] sm:text-[8px] font-mono font-bold tracking-widest text-zinc-400 uppercase">
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
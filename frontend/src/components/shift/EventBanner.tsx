// Визуальный баннер активного события с чистой i18n-локализацией.

import sheikhImg from "../../assets/events/sheikh.webp";
import majimaImg from "../../assets/events/majima.webp";
import { DICTIONARY, type Language } from "../../utils/dictionary";

export type ActiveEventType = "SHEIKH" | "MAJIMA" | null;

interface EventBannerProps {
  lang: Language;
  activeEvent: ActiveEventType;
  remainingSec?: number;
}

export function EventBanner({ lang, activeEvent, remainingSec }: EventBannerProps) {
  if (!activeEvent) return null;
  const t = DICTIONARY[lang];

  // ── 1. ЗОЛОТОЙ ШЕЙХ (Кинематографичный золотой оверлей) ──────────────
  if (activeEvent === "SHEIKH") {
    return (
      <div className="absolute inset-0 z-40 pointer-events-none flex items-center justify-center bg-black/40 backdrop-blur-[1px] select-none animate-[fadeIn_0.3s_ease-out]">
        <div className="relative flex items-center gap-4 sm:gap-6 px-6 sm:px-8 py-3.5 sm:py-4 rounded-xs border-2 border-amber-400 bg-gradient-to-r from-black via-amber-950/95 to-black shadow-[0_0_60px_rgba(251,191,36,0.6)] animate-pulse max-w-[92vw] sm:max-w-[560px]">
          
          {/* Огромный золотой арт Шейха */}
          <div className="relative shrink-0">
            <img
              src={sheikhImg}
              alt="Golden Sheikh"
              draggable={false}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-xs border-2 border-amber-300 object-cover shadow-[0_0_20px_rgba(251,191,36,0.8)]"
            />
            <span className="absolute -top-2 -left-2 text-base sm:text-lg">👑</span>
          </div>

          {/* Инфо-блок */}
          <div className="flex flex-col min-w-0 leading-tight">
            <div className="flex items-center justify-between gap-3 mb-1">
              <span className="text-sm sm:text-base font-black font-sans tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-100 uppercase drop-shadow-[0_0_12px_rgba(251,191,36,0.9)]">
                {t.events.sheikhTitle}
              </span>
              {remainingSec !== undefined && (
                <span className="text-xs sm:text-sm font-mono font-black text-amber-300 bg-amber-950 border border-amber-400 px-2 py-0.5 shadow-[0_0_10px_rgba(251,191,36,0.5)]">
                  {remainingSec}{t.shiftScreen.secondsSuffix}
                </span>
              )}
            </div>
            <span className="text-[10px] sm:text-xs font-mono font-bold tracking-wider text-amber-200 uppercase drop-shadow-[0_0_6px_rgba(251,191,36,0.4)]">
              {t.events.sheikhDesc}
            </span>
          </div>

        </div>
      </div>
    );
  }

  // ── 2. МАДЖИМА С АРБУЗОМ (Неоновый взрыв Baka Mitai) ────────────────
  if (activeEvent === "MAJIMA") {
    return (
      <div className="absolute inset-0 z-40 pointer-events-none flex items-center justify-center bg-black/40 backdrop-blur-[1px] select-none animate-[fadeIn_0.3s_ease-out]">
        <div className="relative flex items-center gap-4 sm:gap-6 px-6 sm:px-8 py-3.5 sm:py-4 rounded-xs border-2 border-rose-500 bg-gradient-to-r from-black via-rose-950/95 to-black shadow-[0_0_60px_rgba(244,63,94,0.6)] animate-bounce max-w-[92vw] sm:max-w-[560px]">
          
          {/* Огромный арт Маджимы */}
          <div className="relative shrink-0">
            <img
              src={majimaImg}
              alt="Majima Watermelon"
              draggable={false}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-xs border-2 border-rose-400 object-cover shadow-[0_0_20px_rgba(244,63,94,0.8)]"
            />
            <span className="absolute -top-2 -left-2 text-base sm:text-lg">🍉</span>
          </div>

          {/* Инфо-блок */}
          <div className="flex flex-col min-w-0 leading-tight">
            <div className="flex items-center justify-between gap-3 mb-1">
              <span className="text-sm sm:text-base font-black font-sans tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-rose-200 via-rose-400 to-rose-100 uppercase drop-shadow-[0_0_12px_rgba(244,63,94,0.9)]">
                {t.events.majimaTitle}
              </span>
              <span className="text-[9px] sm:text-[10px] font-mono font-black text-rose-300 bg-rose-950 border border-rose-500 px-2 py-0.5">
                BAKA MITAI
              </span>
            </div>
            <span className="text-[10px] sm:text-xs font-mono font-bold tracking-wider text-rose-200 uppercase drop-shadow-[0_0_6px_rgba(244,63,94,0.4)]">
              {t.events.majimaDesc}
            </span>
          </div>

        </div>
      </div>
    );
  }

  return null;
}
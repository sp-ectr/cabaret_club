// Модалка вводного инструктажа с крупным текстом и кнопкой закрытия из ClubModal.

import { DICTIONARY, type Language } from "../../utils/dictionary";

interface TutorialModalProps {
  lang: Language;
  onClose: () => void;
}

export function TutorialModal({ lang, onClose }: TutorialModalProps) {
  const t = DICTIONARY[lang].tutorialModal;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 sm:p-5 select-none font-sans">
      <div className="relative flex flex-col w-full max-w-[880px] max-h-[92dvh] border border-zinc-800 bg-[#0b0710]/95 shadow-[0_0_60px_rgba(0,0,0,0.9)] overflow-hidden">
        
        {/* ================= 1. ШАПКА ================= */}
        <div className="flex justify-between items-center px-4 py-2.5 border-b border-zinc-800/80 bg-[#0b0710] shrink-0">
          <div className="flex flex-col">
            <h2 className="text-sm font-mono font-black tracking-[0.25em] text-rose-300 uppercase drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]">
              {t.title}
            </h2>
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest mt-0.5">
              {t.subtitle}
            </span>
          </div>

          {/* Кнопка закрытия [ X ] в едином стиле ClubModal */}
          <button
            onClick={onClose}
            aria-label="close"
            className="h-8 px-2.5 flex items-center justify-center border border-zinc-700 text-zinc-300 hover:border-rose-500/60 hover:text-rose-300 transition-colors text-sm font-mono whitespace-nowrap cursor-pointer"
          >
            [ X ]
          </button>
        </div>

        {/* ================= 2. СКРОЛЛИРУЕМЫЙ СПИСОК (КРУПНЫЙ ТЕКСТ) ================= */}
        <div className="flex-1 overflow-y-auto min-h-0 p-3 sm:p-4 flex flex-col gap-3">
          {t.sections.map((section, idx) => (
            <div
              key={idx}
              className="p-3.5 sm:p-4 border border-zinc-800/90 bg-black/60 flex flex-col gap-1.5 rounded-xs shadow-[0_0_15px_rgba(0,0,0,0.6)]"
            >
              <span className="text-xs sm:text-sm font-mono font-black text-amber-300 tracking-wider uppercase">
                {section.title}
              </span>
              <p className="text-xs sm:text-sm font-mono text-zinc-200 leading-relaxed whitespace-pre-line">
                {section.desc}
              </p>
            </div>
          ))}
        </div>

        {/* ================= 3. ФУТЕР ================= */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-2.5 border-t border-zinc-800/80 bg-[#0b0710] shrink-0">
          <span className="text-[10px] sm:text-xs font-mono text-zinc-400 text-center sm:text-left">
            {t.disclaimer}
          </span>

          <button
            onClick={onClose}
            className="w-full sm:w-auto min-h-[38px] px-8 border border-rose-500/70 bg-gradient-to-r from-rose-950/80 to-black hover:border-rose-400 hover:from-rose-900 text-rose-100 text-xs sm:text-sm font-mono font-black tracking-[0.2em] uppercase transition-all active:scale-95 shadow-[0_0_15px_rgba(244,63,94,0.35)] cursor-pointer"
          >
            {t.understoodBtn}
          </button>
        </div>

      </div>
    </div>
  );
}

// Финансовый отчет по завершении 5-минутной смены. Чистый презентационный компонент:
// не пересчитывает формулы, берет report.netYen как источник истины и вызывает onContinue.

import type { ShiftReport } from "../../game/types";
import { DICTIONARY, type Language } from "../../utils/dictionary";

interface ShiftSummaryModalProps {
  lang: Language;
  report: ShiftReport;
  onContinue: () => void;
}

export function ShiftSummaryModal({ lang, report, onContinue }: ShiftSummaryModalProps) {
  const t = DICTIONARY[lang];
  const s = t.shiftSummary;

  const isProfit = report.netYen >= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-5 select-none font-sans">
      <div className="relative w-full max-w-[780px] max-h-[92dvh] overflow-y-auto border border-zinc-800 bg-[#0b0710]/95 shadow-[0_0_80px_rgba(0,0,0,0.95)] flex flex-col justify-between p-4 sm:p-6 gap-4">
        
        {/* ================= 1. ШАПКА ОТЧЕТА ================= */}
        <div className="flex justify-between items-center border-b border-zinc-800/80 pb-3">
          <div className="flex flex-col">
            <h2 className="text-xs sm:text-sm font-mono font-bold tracking-[0.3em] text-rose-300 uppercase drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]">
              {s.title}
            </h2>
            <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mt-0.5">
              {t.clubModal.tierNames[report.clubTier - 1]}
            </span>
          </div>

          {/* Статистика гостей */}
          <div className="flex items-center gap-3 text-[10px] font-mono">
            <span className="text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-2 py-0.5 rounded-none">
              ✓ {s.servedGuests}: {report.guestsServed}
            </span>
            {report.guestsLostAngry > 0 && (
              <span className="text-rose-400 bg-rose-950/40 border border-rose-800/50 px-2 py-0.5 rounded-none">
                ✕ {s.angryGuests}: {report.guestsLostAngry}
              </span>
            )}
          </div>
        </div>

        {/* ================= 2. БУХГАЛТЕРСКИЙ БАЛАНС ================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 my-auto">
          
          {/* Левая колонка: ДОХОДЫ (+) */}
          <div className="flex flex-col gap-2 p-3 border border-emerald-900/30 bg-emerald-950/10">
            <span className="text-[9px] font-mono tracking-widest text-emerald-400/80 uppercase border-b border-emerald-900/40 pb-1">
              [ + ] ДОХОДНАЯ ЧАСТЬ
            </span>

            {/* Валовая выручка */}
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-zinc-400">{s.grossRevenue}:</span>
              <span className="font-bold text-emerald-300">
                +¥ {report.grossYen.toLocaleString()}
              </span>
            </div>

            {/* VIP Чаевые */}
            {report.vipTipsYen > 0 && (
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-amber-400/90">{s.vipTips}:</span>
                <span className="font-bold text-amber-300">
                  +¥ {report.vipTipsYen.toLocaleString()}
                </span>
              </div>
            )}
          </div>

          {/* Правая колонка: РАСХОДЫ (-) */}
          <div className="flex flex-col gap-1.5 p-3 border border-rose-900/30 bg-rose-950/10">
            <span className="text-[9px] font-mono tracking-widest text-rose-400/80 uppercase border-b border-rose-900/40 pb-1">
              [ − ] ОПЕРАЦИОННЫЕ РАСХОДЫ
            </span>

            {/* Аренда */}
            <div className="flex justify-between items-center text-[11px] font-mono">
              <span className="text-zinc-400">{s.rentExpense}:</span>
              <span className="text-rose-300/80">−¥ {report.rentYen.toLocaleString()}</span>
            </div>

            {/* ФОТ */}
            <div className="flex justify-between items-center text-[11px] font-mono">
              <span className="text-zinc-400">{s.fotExpense}:</span>
              <span className="text-rose-300/80">−¥ {report.fotYen.toLocaleString()}</span>
            </div>

            {/* Вышибала */}
            {report.bouncerYen > 0 && (
              <div className="flex justify-between items-center text-[11px] font-mono">
                <span className="text-zinc-400">{s.bouncerExpense}:</span>
                <span className="text-rose-300/80">−¥ {report.bouncerYen.toLocaleString()}</span>
              </div>
            )}

            {/* Убытки от бомжей */}
            {report.bomzhLossYen > 0 && (
              <div className="flex justify-between items-center text-[11px] font-mono">
                <span className="text-rose-400 font-semibold">{s.bomzhLosses}:</span>
                <span className="text-rose-400 font-bold">−¥ {report.bomzhLossYen.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>

        {/* ================= 3. ИТОГОВАЯ СТРОКА ЧИСТОЙ ПРИБЫЛИ ================= */}
        <div className={`flex items-center justify-between p-3.5 border ${
          isProfit 
            ? "border-emerald-500/60 bg-emerald-950/30 shadow-[0_0_20px_rgba(16,185,129,0.15)]" 
            : "border-rose-500/60 bg-rose-950/40 shadow-[0_0_20px_rgba(244,63,94,0.2)]"
        }`}>
          <span className="text-xs font-mono font-bold tracking-widest uppercase text-zinc-200">
            {isProfit ? s.netProfit : s.netLoss}:
          </span>
          <span className={`text-base sm:text-lg font-mono font-black tracking-wider ${
            isProfit ? "text-emerald-300 drop-shadow-[0_0_10px_rgba(52,211,153,0.6)]" : "text-rose-400 drop-shadow-[0_0_10px_rgba(244,63,94,0.6)]"
          }`}>
            {isProfit ? "+" : ""}¥ {report.netYen.toLocaleString()}
          </span>
        </div>

        {/* ================= 4. ПЛАШКА ОТДЫХА + КНОПКА ================= */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-zinc-800/60">
          {/* Информационный блок сна (без логики внутри!) */}
          <div className="flex items-center gap-2 text-left">
            <span className="text-sm">🌙</span>
            <div className="flex flex-col leading-none">
              <span className="text-[10px] font-mono font-bold text-zinc-300 uppercase">
                {s.sleepBonusTitle}
              </span>
              <span className="text-[8px] font-mono text-zinc-500 mt-0.5">
                {s.sleepBonusDesc}
              </span>
            </div>
          </div>

          {/* Главная кнопка закрытия отчета */}
          <button
            onClick={onContinue}
            className="w-full sm:w-auto min-h-[38px] px-8 border border-rose-500/60 bg-gradient-to-r from-rose-950/70 to-black hover:border-rose-400 hover:from-rose-900/80 text-rose-100 text-xs font-mono font-bold tracking-[0.2em] uppercase transition-all active:scale-95 shadow-[0_0_15px_rgba(244,63,94,0.3)] cursor-pointer"
          >
            {s.continueBtn} &gt;&gt;
          </button>
        </div>

      </div>
    </div>
  );
}
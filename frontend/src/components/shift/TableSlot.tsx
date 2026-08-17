// src/components/shift/TableSlot.tsx
// Адаптивная карточка стола: резиновая высота под любые экраны мобилок.

import type {
  GameTable,
  Guest,
  GuestType,
  HostessId,
  MatchFeedback,
  StatType,
} from "../../game/types";
import { DICTIONARY, type Language } from "../../utils/dictionary";

import poor1 from "../../assets/guests/poor_1.webp";
import poor2 from "../../assets/guests/poor_2.webp";
import poor3 from "../../assets/guests/poor_3.webp";
import mid1 from "../../assets/guests/mid_1.webp";
import mid2 from "../../assets/guests/mid_2.webp";
import mid3 from "../../assets/guests/mid_3.webp";
import rich1 from "../../assets/guests/rich_1.webp";
import rich2 from "../../assets/guests/rich_2.webp";
import rich3 from "../../assets/guests/rich_3.webp";
import bomzhAvatar from "../../assets/events/bomzh.webp";

import yuki from "../../assets/hostesses/yuki.webp";
import mira from "../../assets/hostesses/mira.webp";
import sakura from "../../assets/hostesses/sakura.webp";
import nika from "../../assets/hostesses/nika.webp";
import luna from "../../assets/hostesses/luna.webp";

const GUEST_AVATARS: Record<GuestType, [string, string, string]> = {
  POOR: [poor1, poor2, poor3],
  MID: [mid1, mid2, mid3],
  RICH: [rich1, rich2, rich3],
  BOMZH: [bomzhAvatar, bomzhAvatar, bomzhAvatar],
};

const HOSTESS_AVATARS: Record<HostessId, string> = {
  YUKI: yuki,
  MIRA: mira,
  SAKURA: sakura,
  NIKA: nika,
  LUNA: luna,
};

const STAT_EMOJI: Record<StatType, string> = {
  talk: "💬",
  charisma: "🍸",
  service: "💖",
};

const PATIENCE_MAX = 10;
const SERVING_MAX = 30;

function patienceColor(ratio: number): string {
  if (ratio > 0.6) return "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]";
  if (ratio > 0.3) return "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]";
  return "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.9)] animate-pulse";
}

function guestGlow(type: GuestType): string {
  if (type === "RICH") return "shadow-[0_0_12px_rgba(244,63,94,0.6)] border-rose-500";
  if (type === "MID") return "shadow-[0_0_10px_rgba(168,85,247,0.5)] border-purple-500";
  return "shadow-[0_0_8px_rgba(113,113,122,0.5)] border-zinc-500";
}

function badgeClasses(fb: MatchFeedback): string {
  if (fb === "PERFECT") {
    return "bg-amber-400 text-black border-2 border-amber-200 shadow-[0_0_20px_rgba(251,191,36,0.95)]";
  }
  if (fb === "GOOD") {
    return "bg-teal-600 text-white border border-teal-300 shadow-[0_0_12px_rgba(20,184,166,0.8)]";
  }
  return "bg-rose-700 text-white border border-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.8)]";
}

function guestAvatarSrc(guest: Guest): string {
  return GUEST_AVATARS[guest.type][guest.avatarKey - 1];
}

function pct(ratio: number): string {
  return `${Math.max(0, Math.min(1, ratio)) * 100}%`;
}

interface TableSlotProps {
  lang: Language;
  table: GameTable;
  selectedHostessId: HostessId | null;
  sheikhAura: boolean;
  onAssign: (tableId: 1 | 2 | 3, hostessId: HostessId) => void;
  onPlacate: (tableId: 1 | 2 | 3, hostessId: HostessId) => void;
  label?: string;
}

export function TableSlot({
  lang,
  table,
  selectedHostessId,
  sheikhAura,
  onAssign,
  onPlacate,
  label,
}: TableSlotProps) {
  const t = DICTIONARY[lang];
  const { status, guest, id } = table;

  const auraBorder = sheikhAura
    ? "border-2 border-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.6)] bg-gradient-to-b from-amber-950/50 via-black/90 to-black/90"
    : "border border-zinc-800/90 bg-[#0c0812]/95 shadow-[0_0_15px_rgba(0,0,0,0.8)]";

  // ── 1. COOLDOWN ────────────────────────────────────────────────────────
  if (status === "COOLDOWN") {
    return (
      <div className="relative flex flex-col items-center justify-center rounded-xs border border-zinc-800/40 bg-black/40 opacity-40 p-2 select-none h-full gap-1">
        {label != null && <LabelBadge text={label} />}
        <span className="text-[11px] sm:text-xs font-mono font-bold tracking-widest text-zinc-500 uppercase">
          {t.shiftScreen.tablePrefix} {id}
        </span>
        <span className="text-[11px] sm:text-xs font-mono font-bold text-zinc-400">
          ⏳ {table.remainingSec}{t.shiftScreen.secondsSuffix}
        </span>
      </div>
    );
  }

  // ── 2. BOMZH_BLOCKED ───────────────────────────────────────────────────
  if (status === "BOMZH_BLOCKED") {
    const canPlacate = selectedHostessId !== null;
    return (
      <div
        className={`relative flex flex-col items-center justify-between rounded-xs border-2 bg-black/90 p-2 sm:p-2.5 select-none transition-all h-full
          border-rose-600 shadow-[0_0_25px_rgba(225,29,72,0.5)]
          ${sheikhAura ? "!border-amber-400 !shadow-[0_0_30px_rgba(251,191,36,0.6)]" : ""}`}
      >
        {label != null && <LabelBadge text={label} />}
        
        {/* Аватарка Маджимы */}
        <div className="relative mt-1">
          <img
            src={bomzhAvatar}
            alt="BOMZH"
            draggable={false}
            className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-xs border-2 border-rose-500 object-cover shadow-[0_0_12px_rgba(244,63,94,0.6)]"
          />
          <span className="absolute -bottom-1.5 -right-1.5 bg-rose-950 border border-rose-500 text-[9px] sm:text-[10px] font-mono font-black text-rose-200 px-1 py-0.2">
            {table.remainingSec}{t.shiftScreen.secondsSuffix}
          </span>
        </div>

        {/* Кнопка успокоить */}
        <button
          disabled={!canPlacate}
          onClick={() => {
            if (selectedHostessId !== null) onPlacate(id, selectedHostessId);
          }}
          title={!canPlacate ? t.shiftScreen.chooseHostessHint : undefined}
          className={`w-full min-h-[28px] sm:min-h-[32px] px-2 py-1 rounded-xs text-[9px] sm:text-[10px] font-mono font-black tracking-wider uppercase border transition-all active:scale-95
            ${canPlacate
              ? "bg-gradient-to-r from-rose-950 to-rose-900 border-rose-500 text-rose-100 hover:border-rose-400 cursor-pointer shadow-[0_0_12px_rgba(244,63,94,0.5)] animate-pulse"
              : "bg-zinc-900/70 border-zinc-800 text-zinc-600 cursor-not-allowed"}`}
        >
          {t.shiftScreen.placateBomzh}
        </button>
      </div>
    );
  }

  // ── 3. WAITING ─────────────────────────────────────────────────────────
  if (status === "WAITING" && guest !== null) {
    const patienceRatio = guest.patienceSec > 0 ? table.remainingSec / PATIENCE_MAX : 0;
    const canAssign = selectedHostessId !== null;

    return (
      <div
        className={`relative flex flex-col items-center justify-between rounded-xs p-2 sm:p-2.5 select-none transition-all h-full
          ${canAssign 
            ? "animate-cabaretPulse border-2 border-rose-400 bg-rose-950/30 cursor-pointer shadow-[0_0_20px_rgba(244,63,94,0.5)]" 
            : auraBorder}`}
        onClick={() => {
          if (selectedHostessId !== null) onAssign(id, selectedHostessId);
        }}
      >
        {label != null && <LabelBadge text={label} />}

        {/* Аватар гостя */}
        <div className="flex flex-col items-center gap-1 mt-0.5">
          <img
            src={guestAvatarSrc(guest)}
            alt={guest.type}
            draggable={false}
            className={`w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-xs border-2 object-cover ${guestGlow(guest.type)}`}
          />

          {/* Видимые статы */}
          {guest.visibleStats !== null && (
            <div className="flex gap-1">
              {guest.visibleStats.map((stat) => (
                <span
                  key={stat}
                  className="text-[8px] sm:text-[9px] font-mono font-bold tracking-wider text-zinc-200 bg-black/90 border border-zinc-700 px-1.5 py-0.2 rounded-none"
                >
                  {STAT_EMOJI[stat]} {t.hostessModal.stats[stat]}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Полоса терпения + Кнопка посадки */}
        <div className="w-full flex flex-col gap-1 mt-auto">
          <div className="w-full h-1.5 sm:h-2 bg-zinc-900 border border-zinc-800 rounded-none overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${patienceColor(patienceRatio)}`}
              style={{ width: pct(patienceRatio) }}
            />
          </div>

          {canAssign ? (
            <div className="w-full py-1 bg-rose-950/80 border border-rose-400 text-[9px] sm:text-[10px] font-mono font-black tracking-[0.2em] text-rose-100 text-center uppercase drop-shadow-[0_0_8px_rgba(244,63,94,0.9)] animate-pulse">
              {t.shiftScreen.seatHostess}
            </div>
          ) : (
            <span className="text-[8px] sm:text-[9px] font-mono font-bold text-zinc-400 text-center uppercase tracking-widest leading-none">
              ⏳ {table.remainingSec}{t.shiftScreen.secondsSuffix}
            </span>
          )}
        </div>
      </div>
    );
  }

  // ── 4. SERVING ─────────────────────────────────────────────────────────
  if (status === "SERVING" && guest !== null) {
    const hostessSrc = table.assignedHostessId !== null
      ? HOSTESS_AVATARS[table.assignedHostessId]
      : undefined;
    const servingRatio = table.remainingSec / SERVING_MAX;

    return (
      <div
        className={`relative flex flex-col justify-between rounded-xs p-2 sm:p-2.5 select-none transition-all h-full ${auraBorder}`}
      >
        {label != null && <LabelBadge text={label} />}

        {/* Пара Гость + Хостес */}
        <div className="flex items-center justify-between w-full mt-0.5 px-0.5">
          <img
            src={guestAvatarSrc(guest)}
            alt={guest.type}
            draggable={false}
            className="w-10 h-10 sm:w-13 sm:h-13 md:w-15 md:h-15 rounded-xs border-2 border-zinc-600 object-cover shadow-[0_0_10px_rgba(0,0,0,0.8)]"
          />

          <span className="text-[10px] sm:text-xs font-mono font-bold text-rose-400 animate-pulse">⇄</span>

          {hostessSrc !== undefined && (
            <img
              src={hostessSrc}
              alt="Hostess"
              draggable={false}
              className="w-10 h-10 sm:w-13 sm:h-13 md:w-15 md:h-15 rounded-xs border-2 border-rose-500 object-cover shadow-[0_0_12px_rgba(244,63,94,0.5)]"
            />
          )}
        </div>

        {/* Стриминг выручки */}
        <div className="text-center my-auto py-0.5">
          <span className="text-xs sm:text-base md:text-xl font-mono font-black text-amber-300 tracking-wider drop-shadow-[0_0_10px_rgba(251,191,36,0.8)]">
            ¥ {table.servedYen.toLocaleString()}
          </span>
        </div>

        {/* Полоса прогресса */}
        <div className="w-full flex flex-col gap-0.5">
          <div className="w-full h-1.5 sm:h-2 bg-zinc-900 border border-zinc-800 rounded-none overflow-hidden">
            <div
              className="h-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)] transition-all duration-300"
              style={{ width: pct(servingRatio) }}
            />
          </div>
          <span className="text-[8px] sm:text-[9px] font-mono font-bold text-zinc-400 text-right leading-none">
            {table.remainingSec}{t.shiftScreen.secondsSuffix}
          </span>
        </div>

        {/* Всплывающий бейдж подбора */}
        {table.currentMatchFeedback !== null && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            <span
              className={`px-2.5 py-1 text-[9px] sm:text-[11px] font-mono font-black tracking-widest uppercase rounded-none drop-shadow-[0_0_15px_rgba(0,0,0,0.95)] animate-bounce
                ${badgeClasses(table.currentMatchFeedback)}`}
            >
              {table.currentMatchFeedback === "PERFECT" ? "★ PERFECT ★" : table.currentMatchFeedback}
            </span>
          </div>
        )}
      </div>
    );
  }

  return null;
}

function LabelBadge({ text }: { text: string }) {
  return (
    <span className="absolute top-1 left-1 text-[7px] sm:text-[8px] font-mono font-bold tracking-widest text-zinc-400 uppercase bg-black/80 px-1 py-0.2 border border-zinc-800 z-10">
      {text}
    </span>
  );
}
import { useState } from "react";
import logoImg from "./assets/logo.png";
import { useIsPortrait } from "./hooks/useIsPortrait";
import {
  BRAND,
  DICTIONARY,
  type Language,
  type Screen,
} from "./utils/dictionary";
import { MemeIntro } from "./components/memeIntro";
import { HomeScreen, type ShiftLaunch } from "./screens/HomeScreen";
import { ShiftScreen } from "./screens/ShiftScreen";
import { INITIAL_HOSTESSES } from "./game/config";
import type { Hostess, ClubTier } from "./game/types";
import type { ShiftContext } from "./game/shiftEngine"; // <-- Импорт из правильного файла!

export default function App() {
  const [screen, setScreen] = useState<Screen>("TAP");
  const [shiftLaunch, setShiftLaunch] = useState<ShiftLaunch | null>(null);

  // Хук детектора ориентации экрана
  const isPortrait = useIsPortrait();

  // Ленивая инициализация языка из браузера
  const getInitialLanguage = (): Language => {
    const navLang = navigator.language?.slice(0, 2).toLowerCase();
    if (navLang === "ru" || navLang === "be" || navLang === "uk") {
      return "ru";
    }
    return "en";
  };

  const [lang, setLang] = useState<Language>(getInitialLanguage);

  const handleTapStart = () => {
    setScreen("VIDEO");
  };

  // Запуск смены (свежий старт или F5-реконнект)
  const handleShiftLaunched = (launch: ShiftLaunch) => {
    setShiftLaunch(launch);
    setScreen("SHIFT");
  };

  // Завершение смены и возврат в главное меню
  const handleShiftFinish = () => {
    setShiftLaunch(null);
    setScreen("HOME");
  };

  // Гидратация состава хостес и контекста улучшений для смены
  const buildShiftProps = (launch: ShiftLaunch) => {
    if (launch.kind === "fresh") {
      const activeHostesses: Hostess[] = INITIAL_HOSTESSES.filter((h) =>
        launch.rosterIds.includes(h.id)
      ).map((h) => ({
        id: h.id,
        name: h.name,
        rarity: h.rarity,
        stamina: h.stamina,
        stats: h.stats,
        hired: true,
      }));

      const ctx: ShiftContext = {
        tier: 1,
        hasBouncer: launch.hasBouncer,
        hasNeonSign: false,
        hasVipInterior: false,
        hasPremiumBar: false,
        hasEtiquette: false,
      };

      return {
        shiftId: launch.shift.shiftId,
        startedAt: launch.shift.startedAt,
        seed: launch.shift.seed,
        ctx,
        initialHostesses: activeHostesses,
      };
    }

    // Режим реконнекта
    const activeHostesses: Hostess[] = launch.shift.roster.map((r) => {
      const staticData = INITIAL_HOSTESSES.find((h) => h.id === r.id);
      return {
        id: r.id,
        name: staticData?.name || r.id,
        rarity: staticData?.rarity || "R",
        stamina: r.stamina,
        stats: staticData?.stats || { talk: 50, charisma: 50, service: 50 },
        hired: true,
      };
    });

    const ctx: ShiftContext = {
      tier: launch.shift.tier as ClubTier,
      hasBouncer: launch.shift.hasBouncer,
      hasNeonSign: false,
      hasVipInterior: false,
      hasPremiumBar: false,
      hasEtiquette: false,
    };

    return {
      shiftId: launch.shift.shiftId,
      startedAt: launch.shift.startedAt,
      seed: launch.shift.seed,
      ctx,
      initialHostesses: activeHostesses,
    };
  };

  return (
    <div
      className="relative w-full h-dvh bg-[#09050d] text-rose-500 overflow-hidden select-none font-sans flex items-center justify-center overscroll-none touch-none"
      style={{
        paddingLeft: "max(12px, env(safe-area-inset-left))",
        paddingRight: "max(12px, env(safe-area-inset-right))",
        paddingTop: "max(8px, env(safe-area-inset-top))",
        paddingBottom: "max(8px, env(safe-area-inset-bottom))",
      }}
    >
      {/* ================= 1. ЭКРАН-БЛОКИРОВЩИК ПОРТРЕТНОГО РЕЖИМА ================= */}
      {isPortrait && (
        <div className="absolute inset-0 z-50 bg-[#09050d]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <div className="w-14 h-9 border-2 border-rose-500/70 rounded-xs mb-5 flex items-center justify-center animate-[spin_3s_ease-in-out_infinite]">
            <div className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
          </div>

          <h3 className="text-sm font-black tracking-[0.2em] text-rose-400 mb-2 uppercase">
            {DICTIONARY[lang].rotateTitle}
          </h3>
          <p className="text-[11px] font-mono text-rose-300/60 max-w-[260px] leading-relaxed">
            {DICTIONARY[lang].rotateDesc}
          </p>
        </div>
      )}

      {/* ================= 2. ЭКРАН TAP (Старт) ================= */}
      {screen === "TAP" && (
        <main className="w-full max-w-[960px] h-full flex flex-row items-center justify-center px-4 sm:px-8 py-2 sm:py-4 relative overflow-hidden gap-6 sm:gap-12">
          {/* Неоновые фоновые пятна */}
          <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-[340px] h-[340px] bg-rose-600/10 blur-[90px] rounded-full pointer-events-none" />
          <div className="absolute top-1/2 right-1/3 -translate-y-1/2 w-[240px] h-[240px] bg-amber-500/5 blur-[80px] rounded-full pointer-events-none" />

          {/* ЛОГОТИП */}
          <div className="relative z-10 flex flex-col items-center justify-center max-w-[min(45vw,380px)] shrink-0">
            <img
              src={logoImg}
              alt="Cabaret Logo"
              className="w-full max-h-[56dvh] h-auto object-contain animate-logoGlow"
              draggable={false}
            />

            <div className="mt-1 translate-x-2 text-[9px] sm:text-[10px] font-mono tracking-[0.4em] text-amber-300/80 uppercase drop-shadow-[0_0_8px_rgba(251,191,36,0.3)]">
              — {BRAND.subtitle} —
            </div>
          </div>

          {/* КНОПКИ ДЕЙСТВИЯ */}
          <div className="relative z-10 flex flex-col items-start justify-center gap-2.5 sm:gap-3.5 shrink-0">
            <button
              onClick={handleTapStart}
              className="
                group relative
                border border-rose-500/40
                bg-rose-950/25
                hover:border-rose-400
                hover:bg-rose-900/40
                px-6 sm:px-8 py-2.5 sm:py-3.5
                min-h-[44px]
                rounded-xs
                transition-all duration-300
                shadow-[0_0_20px_rgba(244,63,94,0.15)]
                animate-cabaretPulse
                active:scale-[0.97]
                cursor-pointer
                flex items-center justify-center
              "
            >
              <span className="text-[11px] sm:text-xs font-mono text-rose-100 tracking-[0.25em] sm:tracking-[0.3em] uppercase drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]">
                {DICTIONARY[lang].tapToStart}
              </span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setLang((prev) => (prev === "ru" ? "en" : "ru"));
              }}
              className="
                self-center
                text-[9px]
                font-mono
                tracking-[0.25em]
                text-rose-300/50
                hover:text-rose-200
                py-1.5 px-3
                transition-colors
                active:scale-95
                cursor-pointer
              "
            >
              {DICTIONARY[lang].langButton}
            </button>
          </div>
        </main>
      )}

      {/* ================= 3. ЭКРАН ВИДЕО-ИНТРО ================= */}
      {screen === "VIDEO" && (
        <div className="w-full h-full flex items-center justify-center">
          <MemeIntro onComplete={() => setScreen("HOME")} lang={lang} />
        </div>
      )}

      {/* ================= 4. ГЛАВНЫЙ ЭКРАН ХАБА ================= */}
      {screen === "HOME" && (
        <HomeScreen
          lang={lang}
          onShiftLaunched={handleShiftLaunched}
          onExit={() => setScreen("TAP")}
        />
      )}

      {/* ================= 5. БОЕВОЙ ЭКРАН СМЕНЫ ================= */}
      {screen === "SHIFT" && shiftLaunch && (
        <ShiftScreen
          lang={lang}
          {...buildShiftProps(shiftLaunch)}
          onFinish={handleShiftFinish}
        />
      )}
    </div>
  );
}
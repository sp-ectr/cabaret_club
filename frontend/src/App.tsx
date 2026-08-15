import { useEffect, useState } from "react";
import WebApp from "@twa-dev/sdk";
import logoImg from "./assets/logo.png";
import { useIsPortrait } from "./hooks/useIsPortrait";
import {
  BRAND,
  DICTIONARY,
  type Language,
  type Screen,
} from "./utils/dictionary";
import { MemeIntro } from "./components/memeIntro";
import { HomeScreen } from "./screens/HomeScreen";

export default function App() {
  const [screen, setScreen] = useState<Screen>("TAP");

  // Хук детектора ориентации
  const isPortrait = useIsPortrait();

  // Ленивая инициализация языка
  const getInitialLanguage = (): Language => {
    try {
      const tgLang = WebApp.initDataUnsafe?.user?.language_code;
      if (tgLang === "ru" || tgLang === "be" || tgLang === "uk") {
        return "ru";
      }
    } catch {
      // Игнорируем запуск вне Telegram
    }
    return "en";
  };

  const [lang, setLang] = useState<Language>(getInitialLanguage);

  // Инициализация Telegram WebApp
  useEffect(() => {
    try {
      if (typeof WebApp !== "undefined" && typeof WebApp.ready === "function") {
        WebApp.ready();
        WebApp.expand();
        WebApp.setHeaderColor?.("#09050d");
        WebApp.setBackgroundColor?.("#09050d");
        // Отключаем вертикальные свайпы закрытия в Telegram, если поддерживается
        if (WebApp.isVersionAtLeast?.("7.7")) {
          WebApp.disableVerticalSwipes?.();
        }
      }
    } catch (error) {
      console.warn("Telegram context unavailable:", error);
    }
  }, []);

  const handleTapStart = () => {
    setScreen("VIDEO");
  };

  return (
    <div 
      className="relative w-full h-dvh bg-[#09050d] text-rose-500 overflow-hidden select-none font-sans flex items-center justify-center overscroll-none touch-none"
      style={{
        // Защита от Dynamic Island и вырезов камер по бокам экрана
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

      {/* ================= 2. ЭКРАН TAP (Адаптирован под любые габариты) ================= */}
      {screen === "TAP" && (
        <main className="w-full max-w-[960px] h-full flex flex-row items-center justify-center px-4 sm:px-8 py-2 sm:py-4 relative overflow-hidden gap-6 sm:gap-12">
          {/* Неоновые фоновые пятна */}
          <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-[340px] h-[340px] bg-rose-600/10 blur-[90px] rounded-full pointer-events-none" />
          <div className="absolute top-1/2 right-1/3 -translate-y-1/2 w-[240px] h-[240px] bg-amber-500/5 blur-[80px] rounded-full pointer-events-none" />

          {/* ЛЕВАЯ ЧАСТЬ: ЛОГОТИП (Ограничен по высоте max-h-[58dvh]) */}
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

          {/* ПРАВАЯ ЧАСТЬ: КНОПКИ ДЕЙСТВИЯ */}
          <div className="relative z-10 flex flex-col items-start justify-center gap-2.5 sm:gap-3.5 shrink-0">
            {/* Кнопка входа: минимальная высота 44px под палец */}
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

            {/* Кнопка смены языка */}
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

      {/* ================= 4. ГЛАВНЫЙ ЭКРАН КЛУБА ================= */}
      {screen === "HOME" && (
        <HomeScreen
          lang={lang}
          onOpenShift={() => console.log("OPEN SHIFT TRIGGERED")}
          onExit={() => setScreen("TAP")}
        />
      )}
    </div>
  );
}
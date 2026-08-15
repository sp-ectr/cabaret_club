// src/screens/HomeScreen.tsx
import { useState } from "react";
import { DICTIONARY, type Language } from "../utils/dictionary";
import bgImg from "../assets/fon.png";
import { 
  Building2, 
  Users, 
  Trophy, 
  CheckSquare, 
  ShoppingBag, 
  LogOut,
  Sparkles,
  Coins,
  type LucideIcon 
} from "lucide-react";

export type TabType = "club" | "hostess" | "ranking" | "missions" | "shop";

interface HomeScreenProps {
  lang: Language;
  onOpenShift: () => void;
  onExit: () => void;
}

// Мок профиля для веб-версии: реальный аккаунт подключим при возврате Telegram
const MOCK_USER = {
  username: "KIRYU_CHAN",
  photoUrl: undefined as string | undefined,
};

export function HomeScreen({ lang, onOpenShift, onExit }: HomeScreenProps) {
  // Активный пункт меню
  const [activeTab, setActiveTab] = useState<TabType>("club");

  const username = MOCK_USER.username;
  const userPhoto = MOCK_USER.photoUrl;

  // Моковые данные баланса под MVP
  const [playerStats] = useState({
    level: 12,
    exp: 4200,
    maxExp: 10000,
    yen: 8540500,
    tokens: 12450,
  });

  const t = DICTIONARY[lang];

  // Конфигурация меню (строго с типом LucideIcon)
  const menuItems: { 
    id: TabType; 
    title: string; 
    subtitle: string; 
    icon: LucideIcon; 
    isSoon?: boolean; 
  }[] = [
    { id: "club", title: t.menu.club, subtitle: t.menu.clubSub, icon: Building2 },
    { id: "hostess", title: t.menu.hostess, subtitle: t.menu.hostessSub, icon: Users },
    { id: "ranking", title: t.menu.ranking, subtitle: t.menu.rankingSub, icon: Trophy },
    { id: "missions", title: t.menu.missions, subtitle: t.menu.missionsSub, icon: CheckSquare, isSoon: true },
    { id: "shop", title: t.menu.shop, subtitle: t.menu.shopSub, icon: ShoppingBag, isSoon: true },
  ];

  return (
    <main 
      className="w-full h-full flex items-center justify-center bg-[#09050d] overflow-hidden select-none"
      style={{
        paddingLeft: "max(8px, env(safe-area-inset-left))",
        paddingRight: "max(8px, env(safe-area-inset-right))",
        paddingTop: "max(4px, env(safe-area-inset-top))",
        paddingBottom: "max(4px, env(safe-area-inset-bottom))",
      }}
    >
      {/* Главный контейнер формата 16:9 / Widescreen */}
      <div 
        className="relative w-full max-w-[960px] h-full flex flex-col justify-between px-3 sm:px-5 py-2 sm:py-3 overflow-hidden font-sans border-x border-zinc-900/50 shadow-[0_0_80px_rgba(0,0,0,0.95)]"
        style={{
          backgroundImage: `linear-gradient(to right, rgba(9,5,13,0.88) 0%, rgba(9,5,13,0.25) 50%, rgba(9,5,13,0.85) 100%), url(${bgImg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        
        {/* ================= 1. ВЕРХНЯЯ ПАНЕЛЬ (КОМПАКТНАЯ ШАПКА) ================= */}
        <header className="relative z-20 w-full flex justify-between items-center gap-2">
          
          {/* ЛЕВЫЙ БЛОК: Профиль + Балансы */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Карточка профиля */}
            <div className="flex items-center gap-2 bg-black/70 border border-zinc-800/80 px-2 py-1 rounded-xs backdrop-blur-md">
              <div className="w-7 h-7 sm:w-8 sm:h-8 border border-rose-500/40 rounded-xs overflow-hidden bg-zinc-900 flex items-center justify-center shrink-0">
                {userPhoto ? (
                  <img src={userPhoto} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[10px] font-mono text-rose-400 font-bold">
                    {username.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              
              <div className="flex flex-col pr-1">
                <span className="text-[10px] sm:text-[11px] font-bold text-zinc-100 tracking-wide font-mono leading-none mb-1">
                  {username}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[8px] sm:text-[9px] text-amber-400 font-mono font-semibold leading-none">
                    Lv.{playerStats.level}
                  </span>
                  <div className="w-14 sm:w-16 h-1 bg-zinc-800 rounded-none overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-amber-500 to-rose-500" 
                      style={{ width: `${(playerStats.exp / playerStats.maxExp) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Валюта 1: Йены ¥ */}
            <div className="flex items-center gap-1.5 bg-black/70 border border-zinc-800/80 px-2.5 py-1 rounded-xs backdrop-blur-md">
              <Coins className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="text-[10px] sm:text-[11px] font-mono font-bold text-amber-300 tracking-wider">
                ¥ {playerStats.yen.toLocaleString()}
              </span>
            </div>

            {/* Валюта 2: Звезды / Токены 💎 */}
            <div className="flex items-center gap-1.5 bg-black/70 border border-zinc-800/80 px-2.5 py-1 rounded-xs backdrop-blur-md">
              <Sparkles className="w-3 h-3 text-rose-400 shrink-0" />
              <span className="text-[10px] sm:text-[11px] font-mono font-bold text-rose-300 tracking-wider">
                {playerStats.tokens.toLocaleString()}
              </span>
            </div>
          </div>

          {/* ПРАВЫЙ БЛОК: Бейдж демо и кнопка выхода */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:block border border-zinc-800 bg-black/50 px-2.5 py-1 rounded-xs backdrop-blur-sm">
              <span className="text-[9px] font-mono tracking-widest text-zinc-400">
                {t.demoBadge}
              </span>
            </div>

            <button
              onClick={onExit}
              className="flex items-center gap-1 border border-zinc-800 bg-black/70 hover:border-rose-500/50 hover:bg-rose-950/25 text-zinc-400 hover:text-rose-300 px-2.5 py-1 rounded-xs font-mono text-[9px] tracking-wider transition-all active:scale-95 cursor-pointer"
            >
              <LogOut className="w-3 h-3" />
              <span>{t.exit}</span>
            </button>
          </div>
        </header>

        {/* ================= 2. ЦЕНТРАЛЬНАЯ РАБОЧАЯ ОБЛАСТЬ ================= */}
        <div className="relative z-10 flex flex-1 items-center justify-between my-1">
          
          {/* ЛЕВОЕ МЕНЮ (Компактные асимметричные табы) */}
          <nav className="flex flex-col gap-1.5 w-[150px] sm:w-[170px]">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => !item.isSoon && setActiveTab(item.id)}
                  className={`group relative flex items-center gap-2 sm:gap-2.5 px-2.5 py-1 sm:py-1.5 transition-all duration-200 cursor-pointer text-left
                    border-y border-l border-r-0 rounded-l-xs
                    ${isActive 
                      ? "border-rose-500 bg-gradient-to-r from-rose-950/80 via-rose-950/30 to-transparent text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.25)]" 
                      : "border-zinc-800/80 bg-black/50 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                    }
                    ${item.isSoon ? "opacity-50 cursor-not-allowed" : ""}
                  `}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 transition-colors ${isActive ? "text-rose-400" : "text-zinc-500 group-hover:text-zinc-300"}`} />

                  <div className="flex flex-col leading-tight">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] sm:text-[11px] font-bold tracking-wider uppercase font-sans">
                        {item.title}
                      </span>
                      {item.isSoon && (
                        <span className="text-[7px] font-mono px-1 border border-zinc-700 bg-zinc-900 text-zinc-400 rounded-none">
                          {t.menu.soon}
                        </span>
                      )}
                    </div>
                    <span className="text-[7px] sm:text-[8px] font-mono tracking-widest text-zinc-500 uppercase">
                      {item.subtitle}
                    </span>
                  </div>
                </button>
              );
            })}
          </nav>

          {/* ЦЕНТР: Свободное пространство для арта хостес */}
          <div className="flex-1 h-full flex items-center justify-center pointer-events-none" />

          {/* ПРАВЫЙ НИЖНИЙ УГОЛ: КНОПКА ЗАПУСКА СМЕНЫ */}
          <div className="flex flex-col items-end justify-end self-end mb-1">
            <button
              onClick={onOpenShift}
              className="
                group relative
                border border-rose-500/70
                bg-gradient-to-r from-rose-950/70 to-black
                hover:border-rose-400 hover:from-rose-900/80
                px-5 sm:px-7 py-2.5 sm:py-3
                min-h-[44px]
                rounded-xs
                transition-all duration-300
                shadow-[0_0_25px_rgba(244,63,94,0.35)]
                active:scale-[0.97]
                cursor-pointer
                flex items-center gap-2.5
              "
            >
              <span className="text-[11px] sm:text-xs font-black font-sans text-rose-100 tracking-[0.2em] uppercase drop-shadow-[0_0_10px_rgba(244,63,94,0.8)]">
                {t.openClub}
              </span>
              <span className="text-rose-400 font-mono text-sm font-black group-hover:translate-x-1 transition-transform">
                &gt;&gt;&gt;
              </span>
            </button>
          </div>

        </div>

      </div>
    </main>
  );
}
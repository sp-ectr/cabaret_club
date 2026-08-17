import { useEffect, useRef, useState } from "react";
import {
  api,
  ApiError,
  type InitGameResponse,
  type ShiftState,
  type StartShiftResponse,
} from "../api/client";
import { DICTIONARY, type Language } from "../utils/dictionary";
import type { HostessId, ShiftReport } from "../game/types";
import bgImg from "../assets/fon.png";
import {
  Building2,
  Users,
  Trophy,
  CheckSquare,
  ShoppingBag,
  LogOut,
  Coins,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";
import { ClubModal } from "../components/modals/ClubModal";
import { HostessModal } from "../components/modals/HostessModal";
import { PreShiftModal } from "../components/modals/PreShiftModal";
import { TutorialModal } from "../components/modals/TutorialModal";

export type TabType = "club" | "hostess" | "ranking" | "missions" | "shop";
type ModalKind = "club" | "hostess" | "preshift" | "tutorial" | null;

/** Данные для запуска экрана смены */
export type ShiftLaunch =
  | { kind: "fresh"; shift: StartShiftResponse; rosterIds: HostessId[]; hasBouncer: boolean }
  | { kind: "reconnect"; shift: ShiftState };

interface HomeScreenProps {
  lang: Language;
  onExit: () => void;
  /** Смена запущена или найдена активная — родитель открывает экран смены */
  onShiftLaunched: (launch: ShiftLaunch) => void;
}

const MOCK_USER = {
  username: "KIRYU_CHAN",
  photoUrl: undefined as string | undefined,
};

export function HomeScreen({ lang, onExit, onShiftLaunched }: HomeScreenProps) {
  const t = DICTIONARY[lang];

  const [activeTab, setActiveTab] = useState<TabType | null>(null);
  const [modal, setModal] = useState<ModalKind>(null);
  const [game, setGame] = useState<InitGameResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [closedNotice, setClosedNotice] = useState<ShiftReport | null>(null);

  const launchRef = useRef(onShiftLaunched);
  useEffect(() => {
    launchRef.current = onShiftLaunched;
  });

  const handleInit = (data: InitGameResponse) => {
    if (data.activeShift) {
      launchRef.current({ kind: "reconnect", shift: data.activeShift });
      return;
    }

    setGame(data);
    if (data.autoClosedShift) setClosedNotice(data.autoClosedShift);

    const hasSeen = localStorage.getItem("cabaret_seen_tutorial");
    if (!hasSeen) {
      setModal("tutorial");
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.initGame();
        if (!cancelled) handleInit(data);
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof ApiError ? err.message : "нет связи с сервером");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = async () => {
    try {
      handleInit(await api.initGame());
    } catch {
      // Ошибки показывают сами модалки
    }
  };

  const closeModal = () => {
    if (modal === "tutorial") {
      localStorage.setItem("cabaret_seen_tutorial", "true");
    }
    setModal(null);
    setActiveTab(null);
  };

  const handleResetGame = async () => {
    try {
      const freshData = await api.resetGame();
      handleInit(freshData);
    } catch {
      localStorage.removeItem("cabaret_guest_id");
      window.location.reload();
    }
  };

  const menuItems: {
    id: TabType;
    title: string;
    subtitle: string;
    icon: LucideIcon;
    isSoon?: boolean;
  }[] = [
    { id: "club", title: t.menu.club, subtitle: t.menu.clubSub, icon: Building2 },
    { id: "hostess", title: t.menu.hostess, subtitle: t.menu.hostessSub, icon: Users },
    { id: "ranking", title: t.menu.ranking, subtitle: t.menu.rankingSub, icon: Trophy, isSoon: true },
    { id: "missions", title: t.menu.missions, subtitle: t.menu.missionsSub, icon: CheckSquare, isSoon: true },
    { id: "shop", title: t.menu.shop, subtitle: t.menu.shopSub, icon: ShoppingBag, isSoon: true },
  ];

  if (loadError) {
    return (
      <main className="w-full h-full flex flex-col items-center justify-center gap-3 bg-[#09050d] px-6 select-none font-sans">
        <div className="border border-rose-500/40 bg-rose-950/25 px-4 py-2 text-[11px] font-mono text-rose-300 text-center max-w-[420px]">
          {loadError}
        </div>
        <button
          onClick={() => {
            setLoadError(null);
            void refresh();
          }}
          className="border border-rose-500/50 px-4 py-2 text-[10px] font-mono tracking-[0.2em] text-rose-200 hover:bg-rose-950/30 transition-colors cursor-pointer"
        >
          [ RETRY ]
        </button>
      </main>
    );
  }

  if (!game) {
    return (
      <main className="w-full h-full flex items-center justify-center bg-[#09050d] select-none font-sans">
        <span className="text-[11px] font-mono tracking-[0.3em] text-rose-400/70 uppercase animate-cabaretPulse px-6 py-4 border border-rose-500/30">
          {t.loadingClub}
        </span>
      </main>
    );
  }

  const { player } = game;

  return (
    <main
      className="relative w-full h-full flex items-center justify-center bg-[#09050d] overflow-hidden select-none font-sans"
      style={{
        paddingLeft: "max(8px, env(safe-area-inset-left))",
        paddingRight: "max(8px, env(safe-area-inset-right))",
        paddingTop: "max(4px, env(safe-area-inset-top))",
        paddingBottom: "max(4px, env(safe-area-inset-bottom))",
      }}
    >
      <div
        className="relative w-full max-w-[960px] h-full flex flex-col justify-between px-3 sm:px-5 py-2 sm:py-3 overflow-hidden font-sans border-x border-zinc-900/50 shadow-[0_0_80px_rgba(0,0,0,0.95)]"
        style={{
          backgroundImage: `linear-gradient(to right, rgba(9,5,13,0.88) 0%, rgba(9,5,13,0.25) 50%, rgba(9,5,13,0.85) 100%), url(${bgImg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* ================= 1. ВЕРХНЯЯ ПАНЕЛЬ ================= */}
        <header className="relative z-20 w-full flex justify-between items-center gap-2">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Профиль */}
            <div className="flex items-center gap-2 bg-black/70 border border-zinc-800/80 px-2 py-1 backdrop-blur-md">
              <div className="w-7 h-7 sm:w-8 sm:h-8 border border-rose-500/40 overflow-hidden bg-zinc-900 flex items-center justify-center shrink-0">
                {MOCK_USER.photoUrl ? (
                  <img src={MOCK_USER.photoUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[10px] font-mono text-rose-400 font-bold">
                    {MOCK_USER.username.slice(0, 2)}
                  </span>
                )}
              </div>
              <div className="flex flex-col pr-1 gap-0.5">
                <span className="text-[10px] sm:text-[11px] font-bold text-zinc-100 tracking-wide font-mono leading-none">
                  {MOCK_USER.username}
                </span>
                <span className="text-[9px] font-mono font-bold text-amber-400 tracking-[0.2em] leading-none">
                  {"★".repeat(player.clubTier)}
                  <span className="text-zinc-700">{"★".repeat(3 - player.clubTier)}</span>
                </span>
              </div>
            </div>

            {/* Баланс: йены */}
            <div className="flex items-center gap-1.5 bg-black/70 border border-zinc-800/80 px-2.5 py-1 backdrop-blur-md">
              <Coins className="w-3 h-3 text-amber-400 shrink-0" />
              <span className={`text-[10px] sm:text-[11px] font-mono font-bold tracking-wider ${player.yen < 0 ? "text-rose-400" : "text-amber-300"}`}>
                ¥ {player.yen.toLocaleString()}
              </span>
            </div>

            {/* Флаги конца игры */}
            {player.victory && (
              <div className="border border-amber-500/60 bg-amber-950/30 px-2 py-1 text-[8px] font-mono tracking-[0.15em] text-amber-300 animate-pulse">
                {t.victoryPlate}
              </div>
            )}
            {player.defeat && !player.victory && (
              <div className="border border-rose-500/60 bg-rose-950/40 px-2 py-1 text-[8px] font-mono tracking-[0.15em] text-rose-300 animate-pulse">
                GAME OVER
              </div>
            )}
          </div>

          {/* Правая часть: Обучение, Бейдж демо и Выход */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setModal("tutorial")}
              className="flex items-center gap-1 border border-zinc-800 bg-black/70 hover:border-amber-500/50 hover:bg-amber-950/20 text-zinc-400 hover:text-amber-300 px-2.5 py-1 font-mono text-[9px] tracking-wider transition-all active:scale-95 cursor-pointer"
            >
              <HelpCircle className="w-3 h-3" />
              <span>{t.tutorialModal.helpBtn}</span>
            </button>

            <div className="hidden sm:block border border-zinc-800 bg-black/50 px-2.5 py-1 backdrop-blur-sm">
              <span className="text-[9px] font-mono tracking-widest text-zinc-400">{t.demoBadge}</span>
            </div>
            
            <button
              onClick={onExit}
              className="flex items-center gap-1 border border-zinc-800 bg-black/70 hover:border-rose-500/50 hover:bg-rose-950/25 text-zinc-400 hover:text-rose-300 px-2.5 py-1 font-mono text-[9px] tracking-wider transition-all active:scale-95 cursor-pointer"
            >
              <LogOut className="w-3 h-3" />
              <span>{t.exit}</span>
            </button>
          </div>
        </header>

        {/* Уведомление о закрытой брошенной смене */}
        {closedNotice && (
          <div className="relative z-20 mt-1 flex items-center justify-between gap-2 border border-amber-500/40 bg-amber-950/25 px-3 py-1">
            <span className="text-[9px] font-mono text-amber-300 tracking-wider">
              {t.closedShift}: {closedNotice.netYen >= 0 ? "+" : ""}
              ¥{closedNotice.netYen.toLocaleString()}
            </span>
            <button
              onClick={() => setClosedNotice(null)}
              className="text-[9px] font-mono text-amber-400/70 hover:text-amber-200 cursor-pointer"
            >
              [ X ]
            </button>
          </div>
        )}

        {/* ================= 2. ЦЕНТРАЛЬНАЯ РАБОЧАЯ ОБЛАСТЬ ================= */}
        <div className="relative z-10 flex flex-1 items-center justify-between my-1">
          <nav className="flex flex-col gap-1.5 w-[185px] sm:w-[205px]">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.isSoon) return;
                    setActiveTab(item.id);
                    if (item.id === "club") setModal("club");
                    if (item.id === "hostess") setModal("hostess");
                  }}
                  className={`group relative flex items-center gap-2 sm:gap-2.5 px-2.5 py-1 sm:py-1.5 transition-all duration-200 cursor-pointer text-left
                    border-y border-l border-r-0
                    ${isActive
                      ? "border-rose-500 bg-gradient-to-r from-rose-950/80 via-rose-950/30 to-transparent text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.25)]"
                      : "border-zinc-800/80 bg-black/50 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"}
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
                        <span className="text-[7px] font-mono px-1 border border-zinc-700 bg-zinc-900 text-zinc-400">
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

          <div className="flex-1 h-full flex items-center justify-center pointer-events-none" />

          {/* ПРАВЫЙ НИЖНИЙ УГОЛ: запуск смены / банкротство / победа */}
          <div className="flex flex-col items-end justify-end self-end mb-1 gap-2">
            {player.defeat ? (
              <div className="flex flex-col items-end gap-2 max-w-[280px]">
                <div className="border border-rose-500/60 bg-rose-950/80 px-4 py-2 text-[10px] font-mono font-bold text-rose-300 tracking-[0.15em] text-center shadow-[0_0_15px_rgba(244,63,94,0.4)]">
                  {t.preShiftModal.bankruptcy}
                </div>
                <button
                  onClick={handleResetGame}
                  className="w-full min-h-[38px] px-6 border-2 border-rose-500 bg-gradient-to-r from-rose-950 to-rose-900 hover:border-rose-400 text-rose-100 font-mono font-black text-xs tracking-[0.2em] uppercase transition-all active:scale-95 shadow-[0_0_20px_rgba(244,63,94,0.7)] animate-pulse cursor-pointer"
                >
                  {t.shiftSummary.retryBtn} &gt;&gt;
                </button>
              </div>
            ) : player.victory ? (
              <div className="flex flex-col items-end gap-2 max-w-[280px]">
                <div className="border border-amber-500/60 bg-amber-950/60 px-4 py-2 text-[10px] font-mono font-bold text-amber-300 tracking-[0.15em] text-center shadow-[0_0_15px_rgba(251,191,36,0.4)]">
                  {t.victoryPlate}
                </div>
                <button
                  onClick={handleResetGame}
                  className="w-full min-h-[38px] px-6 border-2 border-amber-500 bg-gradient-to-r from-amber-950 to-amber-900 hover:border-amber-400 text-amber-100 font-mono font-black text-xs tracking-[0.2em] uppercase transition-all active:scale-95 shadow-[0_0_20px_rgba(251,191,36,0.6)] cursor-pointer"
                >
                  {t.shiftSummary.retryBtn} &gt;&gt;
                </button>
              </div>
            ) : (
              <button
                onClick={() => setModal("preshift")}
                className="group relative border border-rose-500/70 bg-gradient-to-r from-rose-950/70 to-black hover:border-rose-400 hover:from-rose-900/80 px-5 sm:px-7 py-2.5 sm:py-3 min-h-[44px] transition-all duration-300 shadow-[0_0_25px_rgba(244,63,94,0.35)] active:scale-[0.97] cursor-pointer flex items-center gap-2.5"
              >
                <span className="text-[11px] sm:text-xs font-black font-sans text-rose-100 tracking-[0.2em] uppercase drop-shadow-[0_0_10px_rgba(244,63,94,0.8)]">
                  {t.openClub}
                </span>
                <span className="text-rose-400 font-mono text-sm font-black group-hover:translate-x-1 transition-transform">
                  &gt;&gt;&gt;
                </span>
              </button>
            )}
          </div>
        </div>

        {/* ================= 3. МОДАЛКИ ================= */}
        {modal === "club" && (
          <ClubModal
            lang={lang}
            player={game.player}
            upgrades={game.upgrades}
            onClose={closeModal}
            onChanged={refresh}
          />
        )}
        {modal === "hostess" && (
          <HostessModal
            lang={lang}
            player={game.player}
            hostesses={game.hostesses}
            onClose={closeModal}
            onChanged={refresh}
          />
        )}
        {modal === "preshift" && (
          <PreShiftModal
            lang={lang}
            player={game.player}
            hostesses={game.hostesses}
            onClose={closeModal}
            onStart={(shift, selectedIds, hasBouncer) => {
              closeModal();
              onShiftLaunched({ kind: "fresh", shift, rosterIds: selectedIds, hasBouncer });
            }}
            onAlreadyActive={(shiftState) => {
              closeModal();
              onShiftLaunched({ kind: "reconnect", shift: shiftState });
            }}
          />
        )}
        {modal === "tutorial" && (
          <TutorialModal lang={lang} onClose={closeModal} />
        )}
      </div>
    </main>
  );
}
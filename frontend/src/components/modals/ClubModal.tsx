// src/components/modals/ClubModal.tsx
// Окно «КЛУБ // РАЗВИТИЕ»: 4 перманентных улучшения + прогрессия звёзд.
// Глупый компонент: данные через props, мутации сам через api,
// после успеха дергает onChanged - родитель перечитывает состояние.

import { useState } from "react";
import {
  api,
  ApiError,
  type PermanentUpgradeId,
  type PlayerState,
  type UpgradeState,
} from "../../api/client";
import { TIER_UPGRADE_COSTS, UPGRADE_CONFIGS } from "../../game/config";
import { DICTIONARY, type Language } from "../../utils/dictionary";

interface ClubModalProps {
  lang: Language;
  player: PlayerState;
  upgrades: UpgradeState;
  onClose: () => void;
  /** после успешной мутации - родитель обновляет состояние */
  onChanged: () => void;
}

// Порядок карточек в сетке (вышибала живёт в подготовке к смене, не тут)
const UPGRADE_ORDER: PermanentUpgradeId[] = ["NEON_SIGN", "VIP_INTERIOR", "PREMIUM_BAR", "ETIQUETTE"];

// Цвета бейджей типов из конфига (kind)
const KIND_STYLES: Record<string, string> = {
  SECURITY: "text-rose-300 border-rose-500/40",
  REWARD: "text-amber-300 border-amber-500/40",
  ECONOMY: "text-fuchsia-300 border-fuchsia-500/40",
  THROUGHPUT: "text-cyan-300 border-cyan-500/40",
  STAFFING: "text-emerald-300 border-emerald-500/40",
};

export function ClubModal({ lang, player, upgrades, onClose, onChanged }: ClubModalProps) {
  const t = DICTIONARY[lang].clubModal;

  // Локальная копия для мгновенного отклика: ответ мутации применяется сразу,
  // родитель синхронизируется через onChanged
  const [yen, setYen] = useState(player.yen);
  const [clubTier, setClubTier] = useState(player.clubTier);
  const [owned, setOwned] = useState<UpgradeState>(upgrades);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runMutation = async (key: string, action: () => Promise<void>) => {
    if (busy) return;
    setError(null);
    setBusy(key);
    try {
      await action();
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "нет связи с сервером");
    } finally {
      setBusy(null);
    }
  };

  const handleBuy = (id: PermanentUpgradeId) =>
    runMutation(id, async () => {
      const res = await api.buyUpgrade(id);
      setYen(res.player.yen);
      setOwned(res.upgrades);
    });

  const nextTier = clubTier < 3 ? ((clubTier + 1) as 2 | 3) : null;
  const nextTierCost = nextTier ? TIER_UPGRADE_COSTS[nextTier] : null;

  const handleUpgradeTier = () =>
    runMutation("TIER", async () => {
      const res = await api.upgradeClub();
      setYen(res.player.yen);
      setClubTier(res.player.clubTier);
    });

  // id улучшения -> ключ флага в UpgradeState
  const OWNED_KEYS: Record<PermanentUpgradeId, keyof UpgradeState> = {
    NEON_SIGN: "neonSign",
    VIP_INTERIOR: "vipInterior",
    PREMIUM_BAR: "premiumBar",
    ETIQUETTE: "etiquette",
  };

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-5">
      <div className="relative w-full max-w-[880px] max-h-[90dvh] overflow-y-auto border border-zinc-800 bg-[#0b0710]/95 shadow-[0_0_60px_rgba(0,0,0,0.9)]">

        {/* Шапка */}
        <div className="sticky top-0 z-10 flex justify-between items-center px-4 py-2 border-b border-zinc-800/80 bg-[#0b0710]">
          <h2 className="text-xs font-mono tracking-[0.3em] text-rose-300 uppercase drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]">
            {t.title}
          </h2>
          <button
            onClick={onClose}
            aria-label="close"
            className="w-7 h-7 flex items-center justify-center border border-zinc-700 text-zinc-400 hover:border-rose-500/60 hover:text-rose-300 transition-colors text-xs font-mono cursor-pointer"
          >
            [ X ]
          </button>
        </div>

        {/* Прогрессия звёзд */}
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-zinc-800/60 bg-black/40">
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[8px] font-mono tracking-[0.25em] text-zinc-500 uppercase">{t.starsTitle}</span>
            <span className="text-[11px] sm:text-xs font-mono font-bold text-amber-300 tracking-wider truncate">
              {t.tierNames[clubTier - 1]}
            </span>
          </div>

          {nextTier && nextTierCost !== null ? (
            <div className="flex items-center gap-2.5 shrink-0">
              <span className="text-[10px] font-mono text-amber-200/70 whitespace-nowrap">
                → {t.tierNames[nextTier - 1]}
              </span>
              <button
                onClick={handleUpgradeTier}
                disabled={busy !== null || yen < nextTierCost}
                className={`
                  min-h-[32px] px-3 sm:px-4 text-[10px] font-mono font-bold tracking-[0.2em] uppercase border transition-all cursor-pointer
                  ${yen >= nextTierCost
                    ? "border-amber-500/60 text-amber-200 bg-amber-950/25 hover:border-amber-400 hover:bg-amber-900/40 active:scale-95 shadow-[0_0_15px_rgba(251,191,36,0.2)]"
                    : "border-zinc-800 text-zinc-600 bg-black/40 cursor-not-allowed"}
                `}
              >
                {busy === "TIER" ? "···" : `${t.upgradeTo} · ¥${nextTierCost.toLocaleString()}`}
              </button>
            </div>
          ) : (
            <span className="text-[10px] font-mono tracking-[0.2em] text-amber-400/80 border border-amber-500/40 px-3 py-1.5">
              {t.maxTier}
            </span>
          )}
        </div>

        {/* Сетка улучшений */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3">
          {UPGRADE_ORDER.map((id) => {
            const cfg = UPGRADE_CONFIGS[id];
            const info = t.upgrades[id];
            const alreadyOwned = owned[OWNED_KEYS[id]];
            const tierLocked = id === "VIP_INTERIOR" && clubTier < cfg.minTier;
            const canAfford = yen >= cfg.cost;
            const disabled = alreadyOwned || tierLocked || !canAfford || busy !== null;

            return (
              <div
                key={id}
                className={`flex flex-col gap-1.5 p-2.5 border bg-black/50
                  ${alreadyOwned ? "border-emerald-700/40" : "border-zinc-800 hover:border-zinc-700"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[11px] font-bold tracking-wider uppercase ${alreadyOwned ? "text-emerald-300/80" : "text-zinc-100"}`}>
                    {info.name}
                  </span>
                  <span className={`text-[7px] font-mono px-1.5 py-0.5 border tracking-[0.15em] ${KIND_STYLES[cfg.kind] ?? "text-zinc-400 border-zinc-700"}`}>
                    {info.kind}
                  </span>
                </div>

                <p className="text-[9px] font-mono text-zinc-400 leading-relaxed">{info.desc}</p>

                <div className="flex items-center justify-between gap-2 mt-auto pt-1">
                  <span className={`text-[11px] font-mono font-bold ${canAfford ? "text-amber-300" : "text-zinc-600"}`}>
                    ¥ {cfg.cost.toLocaleString()}
                  </span>

                  {alreadyOwned ? (
                    <span className="text-[9px] font-mono tracking-[0.2em] text-emerald-400/80 px-3 py-1.5 border border-emerald-700/40">
                      {t.owned}
                    </span>
                  ) : (
                    <button
                      onClick={() => handleBuy(id)}
                      disabled={disabled}
                      title={tierLocked ? t.requiresTier : undefined}
                      className={`
                        min-h-[30px] px-4 text-[10px] font-mono font-bold tracking-[0.2em] uppercase border transition-all
                        ${tierLocked
                          ? "border-amber-500/30 text-amber-300/50 cursor-not-allowed"
                          : canAfford
                            ? "border-rose-500/50 text-rose-100 bg-rose-950/30 hover:border-rose-400 hover:bg-rose-900/45 active:scale-95 cursor-pointer shadow-[0_0_12px_rgba(244,63,94,0.2)]"
                            : "border-zinc-800 text-zinc-600 cursor-not-allowed"}
                      `}
                    >
                      {busy === id ? "···" : tierLocked ? t.requiresTier : t.buy}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Строка ошибки */}
        {error && (
          <div className="mx-3 mb-3 border border-rose-500/40 bg-rose-950/30 px-3 py-1.5 text-[10px] font-mono text-rose-300">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

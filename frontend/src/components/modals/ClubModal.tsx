// src/components/modals/ClubModal.tsx
// Окно «КЛУБ // РАЗВИТИЕ»: улучшения как витрина магазина - аватар услуги
// почти во всю карточку, короткий продающий текст, заметная кнопка покупки.
// Никакой игровой механики в описаниях - мы продаём, а не объясняем формулы.

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

import neonSignImg from "../../assets/club/neon_sign.webp";
import vipInteriorImg from "../../assets/club/vip_interior.webp";
import premiumBarImg from "../../assets/club/premium_bar.webp";
import etiquetteImg from "../../assets/club/etiquette.webp";

interface ClubModalProps {
  lang: Language;
  player: PlayerState;
  upgrades: UpgradeState;
  onClose: () => void;
  /** после успешной мутации - родитель обновляет состояние */
  onChanged: () => void;
}

// Порядок карточек в витрине (вышибала живёт в подготовке к смене, не тут)
const UPGRADE_ORDER: PermanentUpgradeId[] = ["NEON_SIGN", "VIP_INTERIOR", "PREMIUM_BAR", "ETIQUETTE"];

const UPGRADE_IMAGES: Record<PermanentUpgradeId, string> = {
  NEON_SIGN: neonSignImg,
  VIP_INTERIOR: vipInteriorImg,
  PREMIUM_BAR: premiumBarImg,
  ETIQUETTE: etiquetteImg,
};

// id улучшения -> ключ флага в UpgradeState
const OWNED_KEYS: Record<PermanentUpgradeId, keyof UpgradeState> = {
  NEON_SIGN: "neonSign",
  VIP_INTERIOR: "vipInterior",
  PREMIUM_BAR: "premiumBar",
  ETIQUETTE: "etiquette",
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

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 sm:p-5">
      <div className="relative flex flex-col w-full max-w-[1080px] max-h-[92dvh] border border-zinc-800 bg-[#0b0710]/95 shadow-[0_0_60px_rgba(0,0,0,0.9)]">

        {/* Шапка: фиксирована сверху, скролл её не трогает */}
        <div className="flex justify-between items-center px-4 py-2.5 border-b border-zinc-800/80 bg-[#0b0710] shrink-0">
          <h2 className="text-sm font-mono tracking-[0.3em] text-rose-300 uppercase drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]">
            {t.title}
          </h2>
          <div className="flex items-center gap-4">
            <span className="text-sm font-mono font-bold text-amber-300">¥ {yen.toLocaleString()}</span>
            <button
              onClick={onClose}
              aria-label="close"
              className="h-8 px-2.5 flex items-center justify-center border border-zinc-700 text-zinc-300 hover:border-rose-500/60 hover:text-rose-300 transition-colors text-sm font-mono whitespace-nowrap cursor-pointer"
            >
              [ X ]
            </button>
          </div>
        </div>

        {/* Контент: скроллится только эта зона */}
        <div className="overflow-y-auto min-h-0">

        {/* Прогрессия звёзд */}
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-zinc-800/60 bg-black/40">
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[10px] font-mono tracking-[0.25em] text-zinc-500 uppercase">{t.starsTitle}</span>
            <span className="text-sm font-mono font-bold text-amber-300 tracking-wider truncate">
              {t.tierNames[clubTier - 1]}
            </span>
          </div>

          {nextTier && nextTierCost !== null ? (
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs font-mono text-amber-200/70 whitespace-nowrap hidden sm:inline">
                → {t.tierNames[nextTier - 1]}
              </span>
              <button
                onClick={handleUpgradeTier}
                disabled={busy !== null || yen < nextTierCost}
                className={`
                  min-h-[36px] px-4 text-xs font-mono font-black tracking-[0.15em] uppercase border transition-all cursor-pointer
                  ${yen >= nextTierCost
                    ? "border-amber-500/60 text-amber-200 bg-amber-950/25 hover:border-amber-400 hover:bg-amber-900/50 hover:shadow-[0_0_20px_rgba(251,191,36,0.3)] active:scale-95"
                    : "border-zinc-800 text-zinc-600 bg-black/40 cursor-not-allowed"}
                `}
              >
                {busy === "TIER" ? "···" : `${t.upgradeTo} · ¥${(nextTierCost / 1000).toFixed(0)}k`}
              </button>
            </div>
          ) : (
            <span className="text-xs font-mono font-black tracking-[0.2em] text-amber-400/90 border border-amber-500/40 px-3 py-1.5">
              {t.maxTier}
            </span>
          )}
        </div>

        {/* Витрина улучшений */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-3">
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
                className={`flex flex-col border bg-black/60 overflow-hidden
                  ${alreadyOwned ? "border-emerald-600/60" : "border-zinc-800 hover:border-zinc-600"}`}
              >
                {/* Аватар услуги во весь квадрат */}
                <div className="relative">
                  <img
                    src={UPGRADE_IMAGES[id]}
                    alt={info.name}
                    draggable={false}
                    className={`w-full aspect-square object-cover ${alreadyOwned ? "opacity-80" : ""}`}
                  />
                  {alreadyOwned && (
                    <span className="absolute top-1.5 right-1.5 text-[11px] font-black tracking-[0.15em] px-2 py-0.5 bg-black/80 border border-emerald-500/70 text-emerald-300">
                      {t.owned}
                    </span>
                  )}
                  {tierLocked && !alreadyOwned && (
                    <span className="absolute top-1.5 right-1.5 text-[11px] font-black tracking-[0.15em] px-2 py-0.5 bg-black/80 border border-amber-500/70 text-amber-300">
                      ★★
                    </span>
                  )}
                </div>

                {/* Название */}
                <div className="text-center py-1.5 border-b border-zinc-800/80">
                  <span className="text-base font-black text-zinc-100 tracking-[0.1em] uppercase">
                    {info.name}
                  </span>
                </div>

                {/* Продающее описание */}
                <p className="px-2.5 py-2 text-xs leading-snug text-zinc-300/80 flex-1">
                  {info.desc}
                </p>

                {/* Цена и покупка */}
                <div className="flex items-center justify-between gap-2 px-2.5 pb-2.5">
                  <span className={`text-lg font-mono font-bold ${canAfford ? "text-amber-300" : "text-zinc-600"}`}>
                    ¥{(cfg.cost / 1000).toFixed(0)}k
                  </span>

                  {alreadyOwned ? null : (
                    <button
                      onClick={() => handleBuy(id)}
                      disabled={disabled}
                      title={tierLocked ? t.requiresTier : undefined}
                      className={`
                        min-h-[40px] px-4 text-xs font-black tracking-[0.2em] uppercase border transition-all
                        ${tierLocked
                          ? "border-amber-500/30 text-amber-300/50 cursor-not-allowed"
                          : canAfford
                            ? "border-rose-500/70 text-rose-100 bg-rose-950/40 hover:border-rose-400 hover:bg-rose-900/60 hover:shadow-[0_0_20px_rgba(244,63,94,0.4)] active:scale-95 cursor-pointer"
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
          <div className="mx-3 mb-3 border border-rose-500/40 bg-rose-950/30 px-3 py-2 text-xs font-mono text-rose-300">
            {error}
          </div>
        )}

        </div>
      </div>
    </div>
  );
}

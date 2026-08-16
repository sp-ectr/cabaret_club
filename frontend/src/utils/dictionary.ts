// Тип поддерживаемых языков
export type Language = "ru" | "en";
// Тип стейт экранов
export type Screen = "TAP" | "VIDEO" | "HOME";

export const BRAND = {
  subtitle: "RULE THE NIGHT",
} as const;

export const DICTIONARY: Record<
  Language,
  {
    tapToStart: string;
    skip: string;
    langButton: string;
    rotateTitle: string;
    rotateDesc: string;
    menu: {
        club: string;
        clubSub: string;
        hostess: string;
        hostessSub: string;
        ranking: string;
        rankingSub: string;
        missions: string;
        missionsSub: string;
        shop: string;
        shopSub: string;
        soon: string;
    };
    clubModal: {
        title: string;
        starsTitle: string;
        tierNames: [string, string, string];
        upgradeTo: string;
        maxTier: string;
        buy: string;
        owned: string;
        requiresTier: string;
        upgrades: Record<"NEON_SIGN" | "VIP_INTERIOR" | "PREMIUM_BAR" | "ETIQUETTE", {
            name: string;
            desc: string;
            kind: string;
        }>;
    };
    openClub: string;
    exit: string;
    demoBadge: string;
  }
> = {
  ru: {
    tapToStart: "[ ВОЙТИ В КЛУБ ]",
    skip: "ПРОПУСТИТЬ ▸▸",
    langButton: "LANG: RU",
    rotateTitle: "ПОВЕРНИТЕ УСТРОЙСТВО",
    rotateDesc: "Для погружения в клуб разверните экран горизонтально",
    menu: {
      club: "КЛУБ",
      clubSub: "УПРАВЛЕНИЕ",
      hostess: "ХОСТЕС",
      hostessSub: "КОЛЛЕКЦИЯ",
      ranking: "РЕЙТИНГИ",
      rankingSub: "СОРЕВНОВАНИЯ",
      missions: "МИССИИ",
      missionsSub: "ЗАДАНИЯ",
      shop: "МАГАЗИН",
      shopSub: "ПОКУПКИ",
        soon: "СКОРО",
    },
    clubModal: {
        title: "КЛУБ // РАЗВИТИЕ",
        starsTitle: "РЕЙТИНГ КЛУБА",
        tierNames: ["★ ПОДПОЛЬНЫЙ БАР", "★★ CLUB VELVET", "★★★ GRAND KAMUROCHO PALACE"],
        upgradeTo: "УЛУЧШИТЬ КЛУБ",
        maxTier: "МАКСИМУМ",
        buy: "КУПИТЬ",
        owned: "КУПЛЕНО",
        requiresTier: "ТРЕБУЕТСЯ ★★",
        upgrades: {
            NEON_SIGN: { name: "НЕОНОВАЯ ВЫВЕСКА", desc: "Пауза столов 10с → 4с. Вместимость смены растёт до ~24 гостей", kind: "ПРОПУСКНАЯ" },
            VIP_INTERIOR: { name: "VIP-ИНТЕРЬЕР", desc: "VIP Tip +¥50,000 за богача при идеальном подборе (M ≥ 1.7)", kind: "НАГРАДА" },
            PREMIUM_BAR: { name: "ПРЕМИАЛЬНЫЙ БАР", desc: "Чек богачей ×2, но каждая услуга богача стоит +2 задора", kind: "ЭКОНОМИКА" },
            ETIQUETTE: { name: "КУРСЫ ЭТИКЕТА", desc: "Расход задора за обслуживание 15 → 10", kind: "ПЕРСОНАЛ" },
        },
    },
    openClub: "ОТКРЫТЬ КЛУБ",
    exit: "ВЫХОД",
    demoBadge: "MVP DEMO TEST • V0.1",
  },
  en: {
    tapToStart: "[ ENTER THE CLUB ]",
    skip: "SKIP ▸▸",
    langButton: "LANG: EN",
    rotateTitle: "ROTATE YOUR DEVICE",
    rotateDesc: "Please rotate your screen to landscape mode",
    menu: {
      club: "CLUB",
      clubSub: "MANAGEMENT",
      hostess: "HOSTESS",
      hostessSub: "ROSTER",
      ranking: "RANKINGS",
      rankingSub: "DISTRICTS",
      missions: "MISSIONS",
      missionsSub: "TASKS",
      shop: "SHOP",
      shopSub: "PURCHASES",
        soon: "SOON",
    },
    clubModal: {
        title: "CLUB // DEVELOPMENT",
        starsTitle: "CLUB RATING",
        tierNames: ["★ BACKROOM BAR", "★★ CLUB VELVET", "★★★ GRAND KAMUROCHO PALACE"],
        upgradeTo: "UPGRADE CLUB",
        maxTier: "MAX",
        buy: "BUY",
        owned: "OWNED",
        requiresTier: "REQUIRES ★★",
        upgrades: {
            NEON_SIGN: { name: "NEON SIGN", desc: "Table cooldown 10s → 4s. Shift capacity grows to ~24 guests", kind: "THROUGHPUT" },
            VIP_INTERIOR: { name: "VIP INTERIOR", desc: "VIP Tip +¥50,000 for a tycoon on a perfect match (M ≥ 1.7)", kind: "REWARD" },
            PREMIUM_BAR: { name: "PREMIUM BAR", desc: "Tycoon bills ×2, but each tycoon service costs +2 stamina", kind: "ECONOMY" },
            ETIQUETTE: { name: "ETIQUETTE COURSE", desc: "Service stamina drain 15 → 10", kind: "STAFFING" },
        },
    },
    openClub: "OPEN CLUB",
    exit: "EXIT",
    demoBadge: "MVP DEMO TEST • V0.1",
  },
};
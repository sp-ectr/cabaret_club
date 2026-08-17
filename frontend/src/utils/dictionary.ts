// Тип поддерживаемых языков
export type Language = "ru" | "en";
// Тип стейт экранов
export type Screen = "TAP" | "VIDEO" | "HOME" | "SHIFT";

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
        }>;
    };
    hostessModal: {
        title: string;
        hire: string;
        spa: string;
        vacation: string;
        staminaLabel: string;
        ready: string;
        tired: string;
        tiredHint: string;
        burnout: string;
        burnoutHint: string;
        stats: { talk: string; charisma: string; service: string };
    };
    preShiftModal: {
        title: string;
        bouncerLabel: string;
        bouncerDesc: string;
        rentLabel: string;
        fotLabel: string;
        bouncerLine: string;
        totalLabel: string;
        balanceLabel: string;
        expenseNote: string;
        start: string;
        needOne: string;
        zeroStaff: string;
        bankruptcy: string;
        burnoutPlate: string;
        inRoster: string;
    };
    openClub: string;
    exit: string;
    demoBadge: string;
    victoryPlate: string;
    closedShift: string;
    loadingClub: string;
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
            NEON_SIGN: { name: "НЕОНОВАЯ ВЫВЕСКА", desc: "Яркая вывеска видна с конца улицы — мимо никто не пройдёт. Гостей станет заметно больше!" },
            VIP_INTERIOR: { name: "VIP-ИНТЕРЬЕР", desc: "Роскошный ремонт понравится самым щедрым гостям — они не пожалеют чаевых для клуба." },
            PREMIUM_BAR: { name: "ПРЕМИАЛЬНЫЙ БАР", desc: "Элитные напитки в меню — гости остаются дольше и тратят больше." },
            ETIQUETTE: { name: "КУРСЫ ЭТИКЕТА", desc: "Девушки освоят тонкий сервис и будут уставать гораздо меньше." },
        },
    },
    hostessModal: {
        title: "ХОСТЕС // РОСТЕР",
        hire: "НАНЯТЬ",
        spa: "СПА +30",
        vacation: "VIP-ОТПУСК",
        staminaLabel: "ЗАДОР",
        ready: "ГОТОВА",
        tired: "УСТАЛА",
        tiredHint: "M × 0.8",
        burnout: "ВЫГОРАНИЕ",
        burnoutHint: "БЛОКИРОВКА",
        stats: { talk: "РЕЧЬ", charisma: "ХАРИЗМА", service: "СЕРВИС" },
    },
    preShiftModal: {
        title: "ПОДГОТОВКА К СМЕНЕ",
        bouncerLabel: "ВЫШИБАЛА НА СМЕНУ",
        bouncerDesc: "Надёжная защита ваших девочек от незваных гостей",
        rentLabel: "АРЕНДА ЗАЛА",
        fotLabel: "ФОТ (СОСТАВ)",
        bouncerLine: "ВЫШИБАЛА",
        totalLabel: "ИТОГО РАСХОДОВ СМЕНЫ",
        balanceLabel: "ТЕКУЩИЙ БАЛАНС",
        expenseNote: "СПИСЫВАЕТСЯ ИЗ ВЫРУЧКИ ПОСЛЕ СМЕНЫ",
        start: "НАЧАТЬ СМЕНУ (5 МИНУТ)",
        needOne: "ВЫБЕРИТЕ МИНИМУМ ОДНУ ХОСТЕС",
        zeroStaff: "ПЕРСОНАЛ ИСТОЩЁН. ОТПРАВЬТЕ ДЕВУШЕК В СПА",
        bankruptcy: "БАНКРОТСТВО - НЕКОМУ РАБОТАТЬ И НЕ НА ЧТО ЛЕЧИТЬ",
        burnoutPlate: "НУЖЕН СПА",
        inRoster: "В СОСТАВЕ",
    },
    openClub: "ОТКРЫТЬ КЛУБ",
    exit: "ВЫХОД",
    demoBadge: "MVP DEMO TEST • V0.1",
    victoryPlate: "ДЕМО ПРОЙДЕНО — КЛУБ №1 В КАМУРОЧО",
    closedShift: "БРОШЕННАЯ СМЕНА ЗАКРЫТА",
    loadingClub: "ЗАГРУЗКА КЛУБА",
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
            NEON_SIGN: { name: "NEON SIGN", desc: "A bright sign visible from the end of the street — nobody walks past. Noticeably more guests!" },
            VIP_INTERIOR: { name: "VIP INTERIOR", desc: "A luxury renovation for the most generous guests — they will tip the club handsomely." },
            PREMIUM_BAR: { name: "PREMIUM BAR", desc: "Premium drinks on the menu — guests stay longer and spend more." },
            ETIQUETTE: { name: "ETIQUETTE COURSE", desc: "Your girls master fine service and get tired much less." },
        },
    },
    hostessModal: {
        title: "HOSTESS // ROSTER",
        hire: "HIRE",
        spa: "SPA +30",
        vacation: "VIP VACATION",
        staminaLabel: "STAMINA",
        ready: "READY",
        tired: "TIRED",
        tiredHint: "M × 0.8",
        burnout: "BURNOUT",
        burnoutHint: "BLOCKED",
        stats: { talk: "TALK", charisma: "CHARISMA", service: "SERVICE" },
    },
    preShiftModal: {
        title: "SHIFT PREPARATION",
        bouncerLabel: "BOUNCER FOR THE SHIFT",
        bouncerDesc: "Reliable protection for your girls from unwanted guests",
        rentLabel: "HALL RENT",
        fotLabel: "PAYROLL (ROSTER)",
        bouncerLine: "BOUNCER",
        totalLabel: "TOTAL SHIFT EXPENSES",
        balanceLabel: "CURRENT BALANCE",
        expenseNote: "DEDUCTED FROM SHIFT REVENUE",
        start: "START SHIFT (5 MINUTES)",
        needOne: "SELECT AT LEAST ONE HOSTESS",
        zeroStaff: "STAFF EXHAUSTED. SEND THE GIRLS TO SPA",
        bankruptcy: "BANKRUPTCY - NO STAFF AND NO MONEY TO HEAL",
        burnoutPlate: "NEEDS SPA",
        inRoster: "IN ROSTER",
    },
    openClub: "OPEN CLUB",
    exit: "EXIT",
    demoBadge: "MVP DEMO TEST • V0.1",
    victoryPlate: "DEMO COMPLETE — CLUB #1 IN KAMUROCHO",
    closedShift: "ABANDONED SHIFT CLOSED",
    loadingClub: "LOADING CLUB",
  },
};
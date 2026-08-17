export type Language = "ru" | "en";
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
      upgrades: Record<
        "NEON_SIGN" | "VIP_INTERIOR" | "PREMIUM_BAR" | "ETIQUETTE",
        {
          name: string;
          desc: string;
        }
      >;
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
    shiftScreen: {
      shiftTitle: string;
      tablePrefix: string;
      secondsSuffix: string;
      seatHostess: string;
      placateBomzh: string;
      busyHostess: string;
      chooseHostessHint: string;
    };
    events: {
      sheikhTitle: string;
      sheikhDesc: string;
      majimaTitle: string;
      majimaDesc: string;
    };
    shiftSummary: {
      title: string;
      grossRevenue: string;
      vipTips: string;
      rentExpense: string;
      fotExpense: string;
      bouncerExpense: string;
      bomzhLosses: string;
      netProfit: string;
      netLoss: string;
      servedGuests: string;
      angryGuests: string;
      sleepBonusTitle: string;
      sleepBonusDesc: string;
      continueBtn: string;
      defeatTitle: string;
      defeatDesc: string;
      retryBtn: string;
    };
    tutorialModal: {
      title: string;
      subtitle: string;
      sections: {
        title: string;
        desc: string;
      }[];
      disclaimer: string;
      understoodBtn: string;
      helpBtn: string;
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
        NEON_SIGN: {
          name: "НЕОНОВАЯ ВЫВЕСКА",
          desc: "Яркая вывеска видна с конца улицы — мимо никто не пройдёт. Гостей станет заметно больше!",
        },
        VIP_INTERIOR: {
          name: "VIP-ИНТЕРЬЕР",
          desc: "Роскошный ремонт понравится самым щедрым гостям — они не пожалеют чаевых для клуба.",
        },
        PREMIUM_BAR: {
          name: "ПРЕМИАЛЬНЫЙ БАР",
          desc: "Элитные напитки в меню — гости остаются дольше и тратят больше.",
        },
        ETIQUETTE: {
          name: "КУРСЫ ЭТИКЕТА",
          desc: "Девушки освоят тонкий сервис и будут уставать гораздо меньше.",
        },
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
      bankruptcy: "БАНКРОТСТВО — НЕКОМУ РАБОТАТЬ И НЕ НА ЧТО ЛЕЧИТЬ",
      burnoutPlate: "НУЖЕН СПА",
      inRoster: "В СОСТАВЕ",
    },
    shiftScreen: {
      shiftTitle: "СМЕНА В КЛУБЕ",
      tablePrefix: "СТОЛ",
      secondsSuffix: "с",
      seatHostess: "[ ПОСАДИТЬ ]",
      placateBomzh: "УСПОКОИТЬ · −¥15k",
      busyHostess: "[ ЗАНЯТА ]",
      chooseHostessHint: "Выберите хостес внизу",
    },
    events: {
      sheikhTitle: "👑 ВИЗИТ ШЕЙХА",
      sheikhDesc: "СТОЛ №1 ПОЛУЧАЕТ +¥1,500/СЕК",
      majimaTitle: "🍉 МАДЖИМА ПРИНЁС АРБУЗ!",
      majimaDesc: "+20 ЗАДОРА ВСЕМУ СОСТАВУ СМЕНЫ!",
    },
    shiftSummary: {
      title: "БУХГАЛТЕРСКИЙ ОТЧЕТ",
      grossRevenue: "ВАЛОВАЯ ВЫРУЧКА",
      vipTips: "VIP-ЧАЕВЫЕ",
      rentExpense: "АРЕНДА ЗАЛА",
      fotExpense: "ФОТ (ЗАРПЛАТЫ)",
      bouncerExpense: "ВЫШИБАЛА",
      bomzhLosses: "УБЫТКИ ОТ ДИВЕРСИЙ",
      netProfit: "ЧИСТАЯ ПРИБЫЛЬ",
      netLoss: "ЧИСТЫЙ УБЫТОК",
      servedGuests: "ОБСЛУЖЕНО ГОСТЕЙ",
      angryGuests: "УШЛИ В ГНЕВЕ",
      sleepBonusTitle: "ЕСТЕСТВЕННЫЙ СОН",
      sleepBonusDesc: "+20 Задора всем хостес",
      continueBtn: "ПРИНЯТЬ И ПРОДОЛЖИТЬ",
      defeatTitle: "КЛУБ ОБАНКРОТИЛСЯ",
      defeatDesc: "У вас закончились средства на покрытие долгов и лечение персонала.",
      retryBtn: "НАЧАТЬ ЗАНОВО",
    },
    tutorialModal: {
      title: "ИНСТРУКТАЖ УПРАВЛЯЮЩЕГО",
      subtitle: "КАК УПРАВЛЯТЬ КЛУБОМ VELVET",
      sections: [
        {
          title: "1. ТВОЯ ЦЕЛЬ",
          desc: "Преврати захудалый подпольный бар в легендарный клуб уровня ★★★ и удержи команду от выгорания.\n\nЗарабатывай деньги на сменах, развивай клуб, следи за состоянием хостес и принимай решения в критические моменты.\n\nБаланс ниже 0 ¥ — БАНКРОТСТВО.",
        },
        {
          title: "2. КАК ЗАРАБАТЫВАТЬ НА СМЕНЕ",
          desc: "За три столика будут приходить гости с разными предпочтениями: 💬 Речь, 🍸 Харизма и 💖 Сервис.\n\nКликни на хостес внизу → выбери подходящий стол → посади её к гостю.\n\nЧем лучше хостес подходит гостю, тем выше её эффективность и тем больше денег принесёт стол.\n\nНе всегда видны все предпочтения гостя — придётся учиться угадывать.",
        },
        {
          title: "3. БЕРЕГИ ХОСТЕС",
          desc: "Каждая посадка тратит Задор хостес.\n\nУставшая хостес работает хуже (TIRED), а полностью выгоревшая (BURNOUT) не сможет выйти на следующую смену.\n\nПосле смены девушки восстанавливаются, а в СПА можно вернуть им силы быстрее.\n\nТвоя задача — не только заработать как можно больше, но и не оставить клуб без персонала.",
        },
        {
          title: "4. КРИЗИСЫ И СОБЫТИЯ",
          desc: "В течение смены могут происходить неожиданные события:\n\n💀 Диверсия — на стол может прийти незваный гость и заблокировать его. Можно потерять драгоценное время или отправить хостес его успокоить.\n\n👑 Визит Шейха — на 30-й секунде на столе №1 появится особый гость. Не упусти возможность заработать большие деньги.\n\n🍉 Мадзима принёс арбуз — в середине смены произойдёт неожиданный мемный поворот, который поможет твоей команде восстановить Задор.",
        },
        {
          title: "5. РАЗВИВАЙ КЛУБ",
          desc: "Деньги можно не только копить — вкладывай их в улучшения, которые меняют правила игры:\n\n🥷 Вышибала — защищает клуб от диверсий на текущую смену.\n💎 VIP-Интерьер — увеличивает награду за идеальное обслуживание богатых гостей.\n🍸 Премиальный Бар — богатые гости приносят значительно больше, но требуют больше сил от хостес.\n🌃 Неоновая Вывеска — столы быстрее освобождаются, поэтому за смену можно принять больше гостей.\n🎓 Курсы этикета — хостес тратят меньше Задора при обслуживании.\n\nВыбирай улучшения под свою стратегию: одни повышают доход, другие ускоряют оборот, третьи помогают пережить кризисы и сохранить персонал.",
        },
        {
          title: "6. ПОСЛЕ СМЕНЫ",
          desc: "После каждой смены ты получишь итоговый финансовый отчёт.\n\nРеши, что делать с прибылью: развивать клуб, покупать улучшения или восстанавливать хостес.\n\nТоропиться с дорогими покупками не всегда выгодно. Иногда лучший ход — сохранить деньги и пережить следующую смену.",
        },
        {
          title: "7. ГЛАВНАЯ ЦЕЛЬ",
          desc: "Подними клуб с ★ до ★★★, сохрани минимум трёх готовых к работе хостес (READY) и докажи, что именно твой клуб стал №1 в Камурочо.",
        },
      ],
      disclaimer: "⚠️ MVP DEMO VERSION: Баланс и игровые механики находятся в активной калибровке.",
      understoodBtn: "ПОНЯТНО, В КЛУБ >>",
      helpBtn: "ОБУЧЕНИЕ",
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
        NEON_SIGN: {
          name: "NEON SIGN",
          desc: "A bright sign visible from the end of the street — nobody walks past. Noticeably more guests!",
        },
        VIP_INTERIOR: {
          name: "VIP INTERIOR",
          desc: "A luxury renovation for the most generous guests — they will tip the club handsomely.",
        },
        PREMIUM_BAR: {
          name: "PREMIUM BAR",
          desc: "Premium drinks on the menu — guests stay longer and spend more.",
        },
        ETIQUETTE: {
          name: "ETIQUETTE COURSE",
          desc: "Your girls master fine service and get tired much less.",
        },
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
      bankruptcy: "BANKRUPTCY — NO STAFF AND NO MONEY TO HEAL",
      burnoutPlate: "NEEDS SPA",
      inRoster: "IN ROSTER",
    },
    shiftScreen: {
      shiftTitle: "CLUB SHIFT",
      tablePrefix: "TABLE",
      secondsSuffix: "s",
      seatHostess: "[ SEAT ]",
      placateBomzh: "CALM DOWN · −¥15k",
      busyHostess: "[ BUSY ]",
      chooseHostessHint: "Select a hostess below",
    },
    events: {
      sheikhTitle: "👑 SHEIKH'S VISIT",
      sheikhDesc: "TABLE #1 RECEIVES +¥1,500/SEC",
      majimaTitle: "🍉 MAJIMA BROUGHT WATERMELON!",
      majimaDesc: "+20 STAMINA TO ALL ACTIVE HOSTESSES!",
    },
    shiftSummary: {
      title: "SHIFT REPORT",
      grossRevenue: "GROSS REVENUE",
      vipTips: "VIP TIPS",
      rentExpense: "HALL RENT",
      fotExpense: "PAYROLL (WAGES)",
      bouncerExpense: "BOUNCER",
      bomzhLosses: "SABOTAGE LOSSES",
      netProfit: "NET PROFIT",
      netLoss: "NET LOSS",
      servedGuests: "GUESTS SERVED",
      angryGuests: "ANGRY LEAVES",
      sleepBonusTitle: "NATURAL REST",
      sleepBonusDesc: "+20 Stamina to all hostesses",
      continueBtn: "ACCEPT & CONTINUE",
      defeatTitle: "CLUB BANKRUPT",
      defeatDesc: "You ran out of funds to cover debts and heal your staff.",
      retryBtn: "RETRY",
    },
    tutorialModal: {
      title: "MANAGEMENT BRIEFING",
      subtitle: "HOW TO RUN CLUB VELVET",
      sections: [
        {
          title: "1. YOUR OBJECTIVE",
          desc: "Turn a run-down dive bar into a legendary ★★★ 3-Star Club while keeping your team from burnout.\n\nEarn cash on shifts, develop the club, manage staff stamina, and make critical decisions.\n\nBalance below 0 ¥ = BANKRUPTCY.",
        },
        {
          title: "2. EARNING ON A SHIFT",
          desc: "Guests arrive at 3 tables with preferences: 💬 Talk, 🍸 Charisma, and 💖 Service.\n\nClick a hostess below → select a table → seat her.\n\nBetter match = higher efficiency and bigger payout.\n\nHidden preferences require smart deduction!",
        },
        {
          title: "3. CARE FOR YOUR STAFF",
          desc: "Each table assignment costs Stamina (Задор).\n\nA tired hostess suffers a penalty (TIRED), and an exhausted one (BURNOUT) cannot work the next shift.\n\nStaff recovers between shifts, and the SPA restores energy faster.\n\nNever leave your club unstaffed!",
        },
        {
          title: "4. CRISES & EVENTS",
          desc: "Unexpected events occur during shifts:\n\n💀 Sabotage — a brawler blocks a table. Waste time or send a hostess to placate him.\n\n👑 Sheikh's Visit — at 30s, Table #1 gets a massive cash aura.\n\n🍉 Majima with Watermelon — at mid-shift, a meme event restores stamina to your entire working roster.",
        },
        {
          title: "5. CLUB UPGRADES",
          desc: "Invest in game-changing upgrades:\n\n🥷 Bouncer — 0% sabotage chance for the shift.\n💎 VIP Interior — unlocks a +¥50,000 tip for perfect tycoon service.\n🍸 Premium Bar — tycoon bills ×2, but burns extra stamina.\n🌃 Neon Sign — table cooldown 4s (up to 24 guests per shift).\n🎓 Etiquette Course — reduces service stamina drain.\n\nCraft your unique build!",
        },
        {
          title: "6. POST-SHIFT SETTLEMENT",
          desc: "After each shift, review the ledger.\n\nAllocate profit: develop the club, purchase upgrades, or send girls to the SPA.\n\nRushing into expensive investments is risky — sometimes saving cash for next shift is the winning move.",
        },
        {
          title: "7. ULTIMATE VICTORY",
          desc: "Upgrade the club from ★ to ★★★, keep at least 3 hostesses in READY status (stamina ≥ 60), and prove your club is #1 in Kamurocho.",
        },
      ],
      disclaimer: "⚠️ MVP DEMO VERSION: Game balance and economics are actively calibrated.",
      understoodBtn: "UNDERSTOOD, ENTER >>",
      helpBtn: "GUIDE",
    },
    openClub: "OPEN CLUB",
    exit: "EXIT",
    demoBadge: "MVP DEMO TEST • V0.1",
    victoryPlate: "DEMO COMPLETE — CLUB #1 IN KAMUROCHO",
    closedShift: "ABANDONED SHIFT CLOSED",
    loadingClub: "LOADING CLUB",
  },
};
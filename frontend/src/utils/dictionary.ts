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
    openClub: "OPEN CLUB",
    exit: "EXIT",
    demoBadge: "MVP DEMO TEST • V0.1",
  },
};
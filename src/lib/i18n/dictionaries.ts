export type Locale = 'en' | 'ar';

type Dict = {
  app: { name: string; tagline: string };
  nav: { home: string; matches: string; leaderboard: string; profile: string };
  auth: {
    login: string; logout: string; username: string; email: string; password: string;
    loginButton: string; welcomeBack: string; enterCredentials: string;
    forgotPassword: string; loginError: string;
  };
  home: {
    welcome: string; yourPoints: string; yourRank: string;
    nextMatches: string; noMatches: string; predictNow: string; seeAll: string;
  };
  match: {
    kickoffIn: string; closed: string; live: string; finished: string;
    yourPrediction: string; makePrediction: string; submit: string; saved: string;
    qualifierLabel: string; group: string; r32: string; r16: string;
    qf: string; sf: string; '3rd': string; final: string; vs: string;
    upcoming: string; done: string;
    tbd: string; teamsAnnouncedLater: string;
  };
  leaderboard: { title: string; empty: string; pts: string; first: string; second: string; third: string };
  profile: { title: string; group: string; points: string; myPredictions: string; changeLanguage: string };
  predictions: { title: string; empty: string; pending: string; points: string };
  admin: {
    title: string; dashboard: string; matches: string; users: string; scoring: string;
    export: string; winners: string; enterResult: string; scoreMatch: string;
    createUser: string; resetPassword: string; markWinners: string;
  };
  common: { save: string; cancel: string; loading: string; error: string; back: string };
  landing: {
    badge: string;
    motto1: string;
    motto2: string;
    values: string;
    bannerTitle: string;
    bannerSub: string;
    featTeamsTitle: string;
    featTeamsSub: string;
    featScoutsTitle: string;
    featScoutsSub: string;
    featScheduleTitle: string;
    featScheduleSub: string;
    featRankingsTitle: string;
    featRankingsSub: string;
    quoteTitle: string;
    quoteSub: string;
    cta: string;
    scoutsName: string;
    scoutsBe: string;
    scoutsAlways: string;
  };
};

const en: Dict = {
    app: {
      name: 'WC Scouts',
      tagline: 'Predict. Score. Win.',
    },
    nav: {
      home: 'Home',
      matches: 'Matches',
      leaderboard: 'Leaderboard',
      profile: 'Profile',
    },
    auth: {
      login: 'Log in',
      logout: 'Log out',
      username: 'Username',
      email: 'Email',
      password: 'Password',
      loginButton: 'Sign in',
      welcomeBack: 'Welcome back',
      enterCredentials: 'Sign in to predict the next matches',
      forgotPassword: 'Forgot password? Contact your admin.',
      loginError: 'Wrong username or password',
    },
    home: {
      welcome: 'Hi',
      yourPoints: 'Your points',
      yourRank: 'Your rank',
      nextMatches: 'Next matches',
      noMatches: 'No upcoming matches',
      predictNow: 'Predict now',
      seeAll: 'See all',
    },
    match: {
      kickoffIn: 'Kicks off in',
      closed: 'Predictions closed',
      live: 'LIVE',
      finished: 'Finished',
      yourPrediction: 'Your prediction',
      makePrediction: 'Make prediction',
      submit: 'Save prediction',
      saved: 'Prediction saved!',
      qualifierLabel: 'Who advances?',
      group: 'Group stage',
      r32: 'Round of 32',
      r16: 'Round of 16',
      qf: 'Quarterfinals',
      sf: 'Semifinals',
      '3rd': 'Third place',
      final: 'Final',
      vs: 'vs',
      upcoming: 'Upcoming',
      done: 'Finished',
      tbd: 'TBD',
      teamsAnnouncedLater: 'Teams confirmed after the group stage',
    },
    leaderboard: {
      title: 'Leaderboard',
      empty: 'No rankings yet',
      pts: 'pts',
      first: '1st',
      second: '2nd',
      third: '3rd',
    },
    profile: {
      title: 'Profile',
      group: 'Group',
      points: 'Points',
      myPredictions: 'My predictions',
      changeLanguage: 'Change language',
    },
    predictions: {
      title: 'My predictions',
      empty: 'You have not made any predictions yet',
      pending: 'Pending result',
      points: 'points',
    },
    admin: {
      title: 'Admin',
      dashboard: 'Dashboard',
      matches: 'Matches',
      users: 'Users',
      scoring: 'Scoring rules',
      export: 'Export',
      winners: 'Winners',
      enterResult: 'Enter result',
      scoreMatch: 'Lock & score',
      createUser: 'Create user',
      resetPassword: 'Reset password',
      markWinners: 'Mark winners',
    },
    common: {
      save: 'Save',
      cancel: 'Cancel',
      loading: 'Loading…',
      error: 'Something went wrong',
      back: 'Back',
    },
    landing: {
      badge: 'World Cup 2026',
      motto1: 'Scouts of today…',
      motto2: 'Leaders of tomorrow',
      values: 'Faith · Family · Service · Sport',
      bannerTitle: 'Join the journey to World Cup 2026',
      bannerSub: 'Football passion… brings us together',
      featTeamsTitle: 'National teams',
      featTeamsSub: 'Meet the teams competing in the tournament',
      featScoutsTitle: 'Scout groups',
      featScoutsSub: 'Follow the participating groups and rankings',
      featScheduleTitle: 'Match schedule',
      featScheduleSub: 'All matches and times in one place',
      featRankingsTitle: 'Rankings',
      featRankingsSub: 'Track groups and results live',
      quoteTitle: '"Be prepared on the field…"',
      quoteSub: 'as you are prepared in life',
      cta: 'Start predicting',
      scoutsName: 'Saint Joseph Scouts Reneh',
      scoutsBe: 'Be Prepared',
      scoutsAlways: 'Once a scout, always a scout',
    },
};

const ar: Dict = {
    app: {
      name: 'كشّافة المونديال',
      tagline: 'توقّع. اربح النقاط. كن البطل.',
    },
    nav: {
      home: 'الرئيسية',
      matches: 'المباريات',
      leaderboard: 'الترتيب',
      profile: 'حسابي',
    },
    auth: {
      login: 'تسجيل الدخول',
      logout: 'تسجيل الخروج',
      username: 'اسم المستخدم',
      email: 'البريد الإلكتروني',
      password: 'كلمة المرور',
      loginButton: 'دخول',
      welcomeBack: 'أهلًا بعودتك',
      enterCredentials: 'سجّل دخولك لتوقّع المباريات القادمة',
      forgotPassword: 'نسيت كلمة المرور؟ تواصل مع المسؤول.',
      loginError: 'اسم المستخدم أو كلمة المرور غير صحيحة',
    },
    home: {
      welcome: 'مرحبًا',
      yourPoints: 'نقاطك',
      yourRank: 'ترتيبك',
      nextMatches: 'المباريات القادمة',
      noMatches: 'لا توجد مباريات قادمة',
      predictNow: 'توقّع الآن',
      seeAll: 'عرض الكل',
    },
    match: {
      kickoffIn: 'تبدأ خلال',
      closed: 'انتهى وقت التوقّع',
      live: 'مباشر',
      finished: 'منتهية',
      yourPrediction: 'توقّعك',
      makePrediction: 'سجّل توقّعك',
      submit: 'حفظ التوقّع',
      saved: 'تم حفظ التوقّع!',
      qualifierLabel: 'من سيتأهّل؟',
      group: 'دور المجموعات',
      r32: 'دور الـ32',
      r16: 'دور الـ16',
      qf: 'ربع النهائي',
      sf: 'نصف النهائي',
      '3rd': 'المركز الثالث',
      final: 'النهائي',
      vs: 'ضد',
      upcoming: 'قادمة',
      done: 'منتهية',
      tbd: 'يُحدَّد لاحقًا',
      teamsAnnouncedLater: 'تُحدَّد الفرق بعد دور المجموعات',
    },
    leaderboard: {
      title: 'الترتيب',
      empty: 'لا يوجد ترتيب بعد',
      pts: 'نقطة',
      first: 'الأول',
      second: 'الثاني',
      third: 'الثالث',
    },
    profile: {
      title: 'حسابي',
      group: 'المجموعة',
      points: 'النقاط',
      myPredictions: 'توقّعاتي',
      changeLanguage: 'تغيير اللغة',
    },
    predictions: {
      title: 'توقّعاتي',
      empty: 'لم تسجّل أي توقّع بعد',
      pending: 'بانتظار النتيجة',
      points: 'نقطة',
    },
    admin: {
      title: 'لوحة المسؤول',
      dashboard: 'الرئيسية',
      matches: 'المباريات',
      users: 'المستخدمون',
      scoring: 'قواعد النقاط',
      export: 'تصدير',
      winners: 'الفائزون',
      enterResult: 'إدخال النتيجة',
      scoreMatch: 'إغلاق واحتساب',
      createUser: 'إنشاء مستخدم',
      resetPassword: 'إعادة تعيين كلمة المرور',
      markWinners: 'تحديد الفائزين',
    },
    common: {
      save: 'حفظ',
      cancel: 'إلغاء',
      loading: 'جارٍ التحميل…',
      error: 'حدث خطأ ما',
      back: 'رجوع',
    },
    landing: {
      badge: 'كأس العالم 2026',
      motto1: 'كشّافة اليوم…',
      motto2: 'قادة الغد',
      values: 'إيمان · عائلة · خدمة · رياضة',
      bannerTitle: 'تابع معنا رحلة كأس العالم 2026',
      bannerSub: 'شغف كرة القدم… يوحّدنا جميعًا',
      featTeamsTitle: 'المنتخبات',
      featTeamsSub: 'تعرّف على المنتخبات المشاركة في البطولة',
      featScoutsTitle: 'فرق الكشّافة',
      featScoutsSub: 'تابع الفرق المشاركة وترتيبها',
      featScheduleTitle: 'جدول المباريات',
      featScheduleSub: 'كل المباريات والمواعيد في مكان واحد',
      featRankingsTitle: 'ترتيب الفرق',
      featRankingsSub: 'تابع ترتيب المجموعات والنتائج أولًا بأول',
      quoteTitle: '«كن مستعدًا في الملعب…»',
      quoteSub: 'كما أنت مستعد في حياتك',
      cta: 'ابدأ التوقّع',
      scoutsName: 'كشّافة مار يوسف الرينة',
      scoutsBe: 'كن مستعدًا',
      scoutsAlways: 'ما دامك كشّاف',
    },
};

export const dictionaries: Record<Locale, Dict> = { en, ar };

export type Dictionary = Dict;

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries.en;
}

export const LOCALE_COOKIE = 'wc_locale';
export const DEFAULT_LOCALE: Locale = 'ar';

export function isRTL(locale: Locale): boolean {
  return locale === 'ar';
}

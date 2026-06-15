import { Suspense } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { LoginForm } from './LoginForm';
import { getT } from '@/lib/i18n/server';
import { isRTL } from '@/lib/i18n/dictionaries';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Confetti } from '@/components/Confetti';
import { ScoutLogo } from '@/components/ScoutLogo';
import { Copyright } from '@/components/Copyright';

export default async function LoginPage() {
  const { locale, t } = await getT();
  const rtl = isRTL(locale);
  const Back = rtl ? ChevronRight : ChevronLeft;

  return (
    <main className="mx-auto max-w-md min-h-dvh px-5 pt-5 pb-8 flex flex-col relative overflow-hidden">
      <Confetti className="opacity-60" />

      <div className="relative z-10 flex items-center justify-between mb-6">
        <Link href="/" className="btn-ghost-light text-sm">
          <Back className="h-4 w-4" />
          {t.common.back}
        </Link>
        <LanguageSwitcher current={locale} />
      </div>

      <div className="relative z-10 flex flex-col items-center mb-4">
        <ScoutLogo size={96} glow alt={t.landing.scoutsName} />
        <div className="text-xs text-gold-300 mt-3 font-semibold tracking-wide">
          {t.landing.badge}
        </div>
        <div className="text-[10px] text-cream/60 mt-1">{t.landing.scoutsName}</div>
      </div>

      <div className="card-glass relative z-10 flex-1 flex flex-col gap-5">
        <div>
          <h1 className="text-2xl font-black text-cream">{t.auth.welcomeBack}</h1>
          <p className="text-sm text-cream/70 mt-1">{t.auth.enterCredentials}</p>
        </div>
        <Suspense fallback={<div className="text-sm text-cream/60">{t.common.loading}</div>}>
          <LoginForm t={t} />
        </Suspense>
        <p className="text-xs text-cream/70 text-center">
          {t.auth.noAccount}{' '}
          <Link href="/signup" className="text-gold-300 font-semibold">
            {t.auth.signupButton}
          </Link>
        </p>
        <p className="text-xs text-cream/55 text-center mt-auto">{t.auth.forgotPassword}</p>
      </div>

      <Copyright className="relative z-10 mt-2" />
    </main>
  );
}

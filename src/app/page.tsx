import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Trophy } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getT } from '@/lib/i18n/server';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Copyright } from '@/components/Copyright';

export const dynamic = 'force-dynamic';

export default async function LandingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/home');

  const { locale, t } = await getT();

  return (
    <main className="mx-auto max-w-md min-h-dvh relative bg-[#160833] flex flex-col">
      {/* Hero image — full bleed at the top */}
      <div className="relative w-full">
        <Image
          src="/landing-hero.png"
          alt={t.landing.scoutsName}
          width={1024}
          height={1536}
          priority
          className="w-full h-auto object-contain select-none"
          sizes="(max-width: 768px) 100vw, 28rem"
        />
        {/* Soft fade so the CTA below blends into the artwork */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-[#160833]" />
      </div>

      {/* CTA + language switcher, below the artwork — out of the way of baked-in elements */}
      <section className="relative z-10 px-5 -mt-6 pb-8 flex flex-col gap-3">
        <Link href="/signup" className="btn-gold w-full text-base">
          <Trophy className="h-5 w-5" />
          {t.landing.cta}
        </Link>
        <Link href="/login" className="btn-royal w-full text-sm">
          {t.auth.haveAccount} {t.auth.login}
        </Link>
        <div className="flex items-center justify-center">
          <LanguageSwitcher current={locale} />
        </div>
        <div className="text-center text-[11px] text-cream/55">
          {t.landing.scoutsName} · 1972
        </div>
        <Copyright />
      </section>
    </main>
  );
}

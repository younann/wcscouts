import Link from 'next/link';
import { ShieldCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { getT } from '@/lib/i18n/server';
import { isRTL } from '@/lib/i18n/dictionaries';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { locale, t } = await getT();
  const Back = isRTL(locale) ? ChevronRight : ChevronLeft;
  return (
    <div className="mx-auto max-w-2xl min-h-dvh">
      <header className="px-5 pt-5 pb-3 flex items-center justify-between">
        <Link href="/home" className="btn-ghost-light text-sm">
          <Back className="h-4 w-4" />
          {t.common.back}
        </Link>
        <div className="flex items-center gap-2 font-black gold-text">
          <ShieldCheck className="h-5 w-5 text-gold-300" />
          {t.admin.title}
        </div>
        <LanguageSwitcher current={locale} />
      </header>
      {children}
    </div>
  );
}

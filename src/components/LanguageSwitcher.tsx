'use client';

import { useRouter } from 'next/navigation';
import { Globe } from 'lucide-react';
import { LOCALE_COOKIE, type Locale } from '@/lib/i18n/dictionaries';

export function LanguageSwitcher({ current }: { current: Locale }) {
  const router = useRouter();
  const next: Locale = current === 'en' ? 'ar' : 'en';
  const label = current === 'en' ? 'العربية' : 'English';

  function toggle() {
    document.cookie = `${LOCALE_COOKIE}=${next};path=/;max-age=${60 * 60 * 24 * 365}`;
    router.refresh();
  }

  return (
    <button onClick={toggle} className="btn-ghost text-sm">
      <Globe className="h-4 w-4" />
      {label}
    </button>
  );
}

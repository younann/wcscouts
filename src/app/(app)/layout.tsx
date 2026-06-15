import { BottomNav } from '@/components/BottomNav';
import { AppHeader } from '@/components/AppHeader';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Copyright } from '@/components/Copyright';
import { getT } from '@/lib/i18n/server';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { locale, t } = await getT();
  return (
    <div className="mx-auto max-w-md min-h-dvh with-bottom-nav">
      <AppHeader appName={t.app.name} rightSlot={<LanguageSwitcher current={locale} />} />
      {children}
      <Copyright />
      <BottomNav labels={t.nav} />
    </div>
  );
}

import type { Metadata, Viewport } from 'next';
import { getLocale } from '@/lib/i18n/server';
import { isRTL } from '@/lib/i18n/dictionaries';
import './globals.css';

export const metadata: Metadata = {
  title: 'WC Scouts — World Cup Predictions',
  description: 'Predict World Cup matches and climb the scouts leaderboard',
  icons: { icon: '/scout-logo.png' },
};

export const viewport: Viewport = {
  themeColor: '#047857',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const dir = isRTL(locale) ? 'rtl' : 'ltr';
  return (
    <html lang={locale} dir={dir}>
      <body>{children}</body>
    </html>
  );
}

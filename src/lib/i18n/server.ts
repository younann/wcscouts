import { cookies } from 'next/headers';
import { DEFAULT_LOCALE, LOCALE_COOKIE, getDictionary, type Locale } from './dictionaries';

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const v = store.get(LOCALE_COOKIE)?.value;
  return v === 'ar' || v === 'en' ? v : DEFAULT_LOCALE;
}

export async function getT() {
  const locale = await getLocale();
  return { locale, t: getDictionary(locale) };
}

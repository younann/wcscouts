import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatKickoff(iso: string, locale: 'en' | 'ar' = 'en'): string {
  const d = new Date(iso);
  return d.toLocaleString(locale === 'ar' ? 'ar' : 'en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function timeUntil(iso: string, locale: 'en' | 'ar' = 'en'): string {
  const now = Date.now();
  const target = new Date(iso).getTime();
  const diff = target - now;
  if (diff <= 0) return locale === 'ar' ? 'بدأت' : 'started';
  const totalMin = Math.floor(diff / 60000);
  const days = Math.floor(totalMin / (60 * 24));
  const hours = Math.floor((totalMin % (60 * 24)) / 60);
  const minutes = totalMin % 60;
  if (locale === 'ar') {
    if (days > 0) return `${days} يوم ${hours} س`;
    if (hours > 0) return `${hours} س ${minutes} د`;
    return `${minutes} د`;
  }
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function isLocked(kickoffIso: string): boolean {
  return new Date(kickoffIso).getTime() <= Date.now();
}

interface RelativeTimeStrings {
  relativeJustNow: string;
  relativeMinutes: string;
  relativeHours: string;
  relativeDays: string;
}

export function formatRelativeTime(iso: string, t: RelativeTimeStrings): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  if (diffMs < 60_000) return t.relativeJustNow;
  const min = Math.floor(diffMs / 60_000);
  if (min < 60) return t.relativeMinutes.replace('{n}', String(min));
  const hr = Math.floor(min / 60);
  if (hr < 24) return t.relativeHours.replace('{n}', String(hr));
  const days = Math.floor(hr / 24);
  return t.relativeDays.replace('{n}', String(days));
}

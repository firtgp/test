import {formatInTimeZone} from 'date-fns-tz';
import {ru} from 'date-fns/locale';
import type {SiteSettings} from '../data/types';

type Tz = Pick<SiteSettings, 'timezone' | 'timezone_label'>;

/** Дата и время в часовом поясе проекта с подписью пояса: «5 декабря 2026, 18:00 МСК». */
export function formatDateTime(iso: string, tz: Tz): string {
  return `${formatInTimeZone(iso, tz.timezone, 'd MMMM yyyy, HH:mm', {locale: ru})} ${tz.timezone_label}`.trim();
}
export function formatDate(iso: string, tz: Tz): string {
  return formatInTimeZone(iso, tz.timezone, 'd MMMM yyyy', {locale: ru});
}
export function formatTime(iso: string, tz: Tz): string {
  return `${formatInTimeZone(iso, tz.timezone, 'HH:mm', {locale: ru})} ${tz.timezone_label}`.trim();
}
export function formatRam(mb: number | null): string | null {
  if (mb == null) return null;
  return mb % 1024 === 0 ? `${mb / 1024} ГБ` : `${mb} МБ`;
}
/** Форма слова для числа: 1 искра, 2 искры, 5 искр. */
export function plural(n: number, one: string, few: string, many: string): string {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b === 1) return one;
  if (b >= 2 && b <= 4) return few;
  return many;
}
const numberFormat = new Intl.NumberFormat('ru-RU');
export const formatNumber = (n: number) => numberFormat.format(n);
/** Сумма во внутренней валюте: «1 200 искр». Название валюты — из настроек проекта. */
export function formatCoins(n: number, s: Pick<SiteSettings, 'currency_one' | 'currency_few' | 'currency_many'>): string {
  return `${formatNumber(n)} ${plural(n, s.currency_one, s.currency_few, s.currency_many)}`;
}
export function serverAddress(host: string, port: number): string {
  return port === 25565 ? host : `${host}:${port}`;
}

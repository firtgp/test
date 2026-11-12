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
export function serverAddress(host: string, port: number): string {
  return port === 25565 ? host : `${host}:${port}`;
}

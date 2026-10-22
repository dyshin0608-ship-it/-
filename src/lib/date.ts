import type { DateString, TimeString } from './types';

const pad = (n: number) => String(n).padStart(2, '0');

/** Date 객체를 로컬 시간 기준 "YYYY-MM-DD"로 바꾼다. (toISOString은 UTC라 날짜가 밀릴 수 있다) */
export function toDateString(date: Date): DateString {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function toTimeString(date: Date): TimeString {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function today(): DateString {
  return toDateString(new Date());
}

/** "YYYY-MM-DD"를 그 날 00:00의 로컬 Date로 만든다. */
export function parseDate(value: DateString): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** "HH:MM"을 오늘 날짜의 로컬 Date로 만든다. 시각 선택기의 초기값으로 쓴다. */
export function parseTime(value: TimeString): Date {
  const [h, m] = value.split(':').map(Number);
  const date = new Date();
  date.setHours(h, m, 0, 0);
  return date;
}

export function addDays(value: DateString, days: number): DateString {
  const date = parseDate(value);
  date.setDate(date.getDate() + days);
  return toDateString(date);
}

/** from부터 to까지 며칠인지 (양쪽 끝 포함). 7일치 약이면 7을 돌려준다. */
export function dayCount(from: DateString, to: DateString): number {
  const ms = parseDate(to).getTime() - parseDate(from).getTime();
  return Math.round(ms / 86_400_000) + 1;
}

export function minutesOf(time: TimeString): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function sortTimes(times: TimeString[]): TimeString[] {
  return [...times].sort((a, b) => minutesOf(a) - minutesOf(b));
}

/** "08:30" -> "오전 8:30" */
export function formatTime(time: TimeString): string {
  const [h, m] = time.split(':').map(Number);
  const period = h < 12 ? '오전' : '오후';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${period} ${hour12}:${pad(m)}`;
}

/** "2026-10-22" -> "2026년 10월 22일" */
export function formatDate(value: DateString): string {
  const [y, m, d] = value.split('-').map(Number);
  return `${y}년 ${m}월 ${d}일`;
}

/** 올해 날짜는 연도를 생략한다. "10월 22일" */
export function formatDateShort(value: DateString): string {
  const [y, m, d] = value.split('-').map(Number);
  const thisYear = new Date().getFullYear();
  return y === thisYear ? `${m}월 ${d}일` : `${y}년 ${m}월 ${d}일`;
}

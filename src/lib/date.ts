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

/** 알림이 언제 오는지 보여줄 때 쓴다. "오늘" / "내일" / "10월 24일" */
export function formatRelativeDay(value: DateString): string {
  const now = today();
  if (value === now) return '오늘';
  if (value === addDays(now, 1)) return '내일';
  return formatDateShort(value);
}

/** "2026-10-22" -> "10월 22일 수요일" */
export function formatDateWithWeekday(value: DateString): string {
  const date = parseDate(value);
  const weekday = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
  return `${date.getMonth() + 1}월 ${date.getDate()}일 ${weekday}요일`;
}

/** 다음 알림까지 남은 시간. "12분 뒤", "3시간 20분 뒤", "2일 뒤" */
export function formatCountdown(at: Date, now: Date = new Date()): string {
  const minutes = Math.round((at.getTime() - now.getTime()) / 60_000);
  if (minutes <= 0) return '곧';
  if (minutes < 60) return `${minutes}분 뒤`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const rest = minutes % 60;
    return rest === 0 ? `${hours}시간 뒤` : `${hours}시간 ${rest}분 뒤`;
  }
  return `${Math.floor(hours / 24)}일 뒤`;
}

/** 그 달의 1일. "2026-10-22" -> "2026-10-01" */
export function startOfMonth(value: DateString): DateString {
  return `${value.slice(0, 7)}-01`;
}

/** 달을 앞뒤로 옮긴다. 말일이 없는 달로 가도 1일 기준이라 안전하다. */
export function addMonths(value: DateString, months: number): DateString {
  const [y, m] = value.split('-').map(Number);
  const total = (y * 12 + (m - 1)) + months;
  return `${Math.floor(total / 12)}-${pad((total % 12) + 1)}-01`;
}

/** 그 달의 날수. */
export function daysInMonth(value: DateString): number {
  const [y, m] = value.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

/** 그 달 1일의 요일 (0=일요일). 달력 첫 줄의 빈칸 수가 된다. */
export function firstWeekday(value: DateString): number {
  return parseDate(startOfMonth(value)).getDay();
}

/** "2026년 10월" */
export function formatMonth(value: DateString): string {
  const [y, m] = value.split('-').map(Number);
  return `${y}년 ${m}월`;
}

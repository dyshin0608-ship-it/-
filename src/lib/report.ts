import { addDays, formatDate, formatDateWithWeekday, formatTime } from './date';
import type { DoseRecords, DoseStatus } from './doses';
import { doseDateTime, doseNotificationId, dosesForDate } from './schedule';
import type { DateString, Medication, TimeString } from './types';

/**
 * 복약 기록 보고서. 진료 때 보여 주기 위한 것이다.
 *
 * 숫자를 만들어 내지 않는 것이 이 파일의 규칙이다. 표시하지 않은 회차를
 * "못 먹음"으로 세면 보고서가 거짓이 되고, 그걸 들고 진료를 받으면 사람이
 * 다친다. 그래서 표시하지 않은 회차는 따로 센다.
 *
 * 아직 오지 않은 복용 시각도 세지 않는다. 오늘까지로 기간을 잡으면 오늘 저녁
 * 약이 아직 안 먹은 것으로 들어가는데, 그건 안 먹은 게 아니라 때가 안 된 것이다.
 */
export type DoseTally = {
  /** 때가 지난 예정 회차 수. taken + missed + unknown + unmarked 와 같다. */
  due: number;
  taken: number;
  missed: number;
  unknown: number;
  /** 아무 표시도 하지 않은 회차. 먹었는지 알 수 없으므로 어느 쪽에도 넣지 않는다. */
  unmarked: number;
};

export type ReportDose = {
  medicationId: string;
  medicationName: string;
  time: TimeString;
  /** null이면 표시하지 않은 회차. */
  status: DoseStatus | null;
};

export type ReportDay = {
  date: DateString;
  doses: ReportDose[];
};

export type ReportMedication = {
  id: string;
  name: string;
  times: TimeString[];
  startDate: DateString;
  endDate: DateString | null;
  tally: DoseTally;
};

export type Report = {
  from: DateString;
  to: DateString;
  generatedAt: Date;
  total: DoseTally;
  medications: ReportMedication[];
  /** 때가 지난 회차가 하나라도 있는 날만 들어 있다. */
  days: ReportDay[];
};

function emptyTally(): DoseTally {
  return { due: 0, taken: 0, missed: 0, unknown: 0, unmarked: 0 };
}

function count(tally: DoseTally, status: DoseStatus | null): void {
  tally.due += 1;
  if (status === null) tally.unmarked += 1;
  else tally[status] += 1;
}

/**
 * 기간 안의 복용 기록을 모은다.
 *
 * from..to는 둘 다 포함한다. now보다 뒤에 있는 복용 시각은 건너뛴다.
 */
export function buildReport(
  medications: Medication[],
  records: DoseRecords,
  from: DateString,
  to: DateString,
  now: Date,
): Report {
  const total = emptyTally();
  const perMedication = new Map<string, DoseTally>();
  const days: ReportDay[] = [];
  const nowMs = now.getTime();

  for (const medication of medications) {
    perMedication.set(medication.id, emptyTally());
  }

  for (let date = from; date <= to; date = addDays(date, 1)) {
    const doses: ReportDose[] = [];

    for (const dose of dosesForDate(medications, date)) {
      // 아직 때가 오지 않은 회차는 보고서에 넣지 않는다.
      if (doseDateTime(date, dose.time).getTime() > nowMs) continue;

      const status = records[doseNotificationId(dose.medicationId, date, dose.time)]?.status ?? null;
      doses.push({
        medicationId: dose.medicationId,
        medicationName: dose.medicationName,
        time: dose.time,
        status,
      });
      count(total, status);
      const mine = perMedication.get(dose.medicationId);
      if (mine) count(mine, status);
    }

    if (doses.length > 0) days.push({ date, doses });
  }

  const reported: ReportMedication[] = [];
  for (const medication of medications) {
    const tally = perMedication.get(medication.id) ?? emptyTally();
    // 기간 안에 먹을 일이 없던 약은 보고서에 넣지 않는다.
    if (tally.due === 0) continue;
    reported.push({
      id: medication.id,
      name: medication.name,
      times: medication.times,
      startDate: medication.startDate,
      endDate: medication.endDate,
      tally,
    });
  }

  return { from, to, generatedAt: now, total, medications: reported, days };
}

/**
 * 복용률. 표시하지 않은 회차는 분자에도 분모에도 넣지 않는다.
 *
 * 표시한 회차가 하나도 없으면 null이다. 0%로 적으면 "하나도 안 먹었다"는 뜻이
 * 되어 버리는데, 사실은 "기록하지 않았다"다.
 */
export function adherence(tally: DoseTally): number | null {
  const marked = tally.taken + tally.missed + tally.unknown;
  if (marked === 0) return null;
  return tally.taken / marked;
}

function percent(value: number | null): string {
  return value === null ? '—' : `${(value * 100).toFixed(1)}%`;
}

/**
 * 복용률을 "83.9% (73/87)" 꼴로 적는다.
 *
 * 퍼센트만 적으면 분모가 보이지 않는다. 표시한 회차가 11개뿐인데 전부 먹었으면
 * 100%가 되는데, 그걸 그냥 "100%"로만 보여 주면 보는 사람이 "14회 다 먹었다"로
 * 읽는다. 진료에 쓰는 문서라 분모가 보여야 한다.
 */
function adherenceText(tally: DoseTally): string {
  const marked = tally.taken + tally.missed + tally.unknown;
  if (marked === 0) return '<span class="muted">기록 없음</span>';
  return (
    `${percent(adherence(tally))}` +
    `<div class="frac">${tally.taken}/${marked} 회</div>`
  );
}

const STATUS_TEXT: Record<DoseStatus, string> = {
  taken: '먹음',
  missed: '못 먹음',
  unknown: '모름',
};

const STATUS_CLASS: Record<DoseStatus, string> = {
  taken: 'taken',
  missed: 'missed',
  unknown: 'unsure',
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatStamp(at: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${at.getFullYear()}년 ${at.getMonth() + 1}월 ${at.getDate()}일 ${pad(at.getHours())}:${pad(at.getMinutes())}`;
}

/**
 * 보고서를 인쇄용 HTML로 만든다.
 *
 * 바깥에서 가져오는 글꼴이나 이미지를 쓰지 않는다. 인터넷 없이도 PDF가
 * 만들어져야 하고, 이 앱은 기록을 밖으로 보내지 않는다.
 */
export function renderReportHtml(report: Report): string {
  const { total } = report;

  const summaryRows = report.medications
    .map(
      (medication) => `
      <tr>
        <td class="name">${escapeHtml(medication.name)}</td>
        <td>${medication.times.map((time) => escapeHtml(formatTime(time))).join('<br>')}</td>
        <td class="num">${medication.tally.due}</td>
        <td class="num taken">${medication.tally.taken}</td>
        <td class="num missed">${medication.tally.missed}</td>
        <td class="num unsure">${medication.tally.unknown}</td>
        <td class="num muted">${medication.tally.unmarked}</td>
        <td class="num strong">${adherenceText(medication.tally)}</td>
      </tr>`,
    )
    .join('');

  const dayRows = report.days
    .map(
      (day) => `
      <tr>
        <td class="date">${escapeHtml(formatDateWithWeekday(day.date))}</td>
        <td>
          ${day.doses
            .map(
              (dose) =>
                `<span class="dose ${dose.status ? STATUS_CLASS[dose.status] : 'none'}">` +
                `${escapeHtml(formatTime(dose.time))} ${escapeHtml(dose.medicationName)}` +
                ` · ${dose.status ? STATUS_TEXT[dose.status] : '표시 없음'}</span>`,
            )
            .join('')}
        </td>
      </tr>`,
    )
    .join('');

  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<title>복약 기록</title>
<style>
  @page { size: A4; margin: 14mm 12mm; }
  * { box-sizing: border-box; }
  body { font-family: sans-serif; color: #172033; font-size: 10.5pt; line-height: 1.5; margin: 0; }
  h1 { font-size: 17pt; margin: 0 0 2mm; }
  h2 { font-size: 11.5pt; margin: 8mm 0 2mm; padding-bottom: 1mm; border-bottom: 1px solid #172033; }
  .period { font-size: 11pt; font-weight: 700; }
  .meta { color: #64748B; font-size: 9pt; margin-top: 1mm; }
  .cards { display: flex; gap: 2mm; margin: 4mm 0 0; }
  .card { flex: 1; border: 1px solid #E2E8F0; border-radius: 2mm; padding: 2.5mm; text-align: center; }
  .card .n { font-size: 15pt; font-weight: 700; }
  .card .k { font-size: 8.5pt; color: #64748B; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border-bottom: 1px solid #E2E8F0; padding: 1.6mm 1.2mm; text-align: left; vertical-align: top; }
  th { font-size: 8.5pt; color: #64748B; font-weight: 600; white-space: nowrap; }
  tr { page-break-inside: avoid; }
  .num { text-align: right; white-space: nowrap; }
  .name, .strong { font-weight: 700; }
  .date { white-space: nowrap; width: 34mm; }
  .taken { color: #15803D; }
  .missed { color: #DC2626; }
  .unsure { color: #D97706; }
  .muted { color: #94A3B8; }
  .frac { font-size: 8pt; font-weight: 400; color: #64748B; }
  .dose { display: inline-block; margin: 0 2.5mm 0.6mm 0; white-space: nowrap; }
  .dose.none { color: #94A3B8; }
  .note { margin-top: 8mm; padding-top: 2mm; border-top: 1px solid #E2E8F0; color: #64748B; font-size: 8.5pt; }
</style>
</head>
<body>
  <h1>복약 기록</h1>
  <div class="period">${escapeHtml(formatDate(report.from))} ~ ${escapeHtml(formatDate(report.to))}</div>
  <div class="meta">또박에서 ${escapeHtml(formatStamp(report.generatedAt))}에 만들었습니다. 이름 등 신원 정보는 들어 있지 않습니다.</div>

  <div class="cards">
    <div class="card"><div class="n">${total.due}</div><div class="k">예정</div></div>
    <div class="card"><div class="n taken">${total.taken}</div><div class="k">먹음</div></div>
    <div class="card"><div class="n missed">${total.missed}</div><div class="k">못 먹음</div></div>
    <div class="card"><div class="n unsure">${total.unknown}</div><div class="k">모름</div></div>
    <div class="card"><div class="n muted">${total.unmarked}</div><div class="k">표시 없음</div></div>
    <div class="card"><div class="n">${percent(adherence(total))}</div><div class="k">복용률 (${total.taken}/${total.taken + total.missed + total.unknown}회)</div></div>
  </div>

  <h2>약별 요약</h2>
  <table>
    <thead><tr>
      <th>약</th><th>복용 시각</th><th class="num">예정</th><th class="num">먹음</th>
      <th class="num">못 먹음</th><th class="num">모름</th><th class="num">표시 없음</th><th class="num">복용률</th>
    </tr></thead>
    <tbody>${summaryRows || '<tr><td colspan="8">기간 안에 복용 기록이 없습니다.</td></tr>'}</tbody>
  </table>

  <h2>날짜별 기록</h2>
  <table>
    <tbody>${dayRows || '<tr><td>기간 안에 복용 기록이 없습니다.</td></tr>'}</tbody>
  </table>

  <div class="note">
    복용률은 <strong>표시한 회차만</strong>으로 계산했습니다. 표시 없음은 먹었는지 알 수 없는
    회차이므로 먹음에도, 못 먹음에도 넣지 않았습니다. 아직 때가 오지 않은 복용 시각은
    세지 않았습니다.
  </div>
</body>
</html>`;
}

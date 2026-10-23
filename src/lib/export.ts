import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { renderReportHtml, type Report } from './report';

/**
 * 복약 기록을 PDF로 만들어 내보낸다.
 *
 * 만드는 것도 보내는 것도 전부 기기 안에서 일어난다. 서버로 올리지 않는다.
 * 사용자가 카카오톡으로 보내든, 메일로 보내든, 파일로 저장하든 그건 안드로이드
 * 공유 화면이 하는 일이고 앱은 관여하지 않는다.
 */

export type ExportResult =
  | { kind: 'shared' }
  /** PDF는 만들었는데 공유 화면을 열 수 없는 기기다. 파일 위치를 알려 준다. */
  | { kind: 'saved'; uri: string }
  | { kind: 'failed'; message: string };

export async function exportReportPdf(report: Report): Promise<ExportResult> {
  let uri: string;
  try {
    const file = await Print.printToFileAsync({
      html: renderReportHtml(report),
      base64: false,
    });
    uri = file.uri;
  } catch {
    return { kind: 'failed', message: 'PDF를 만들지 못했습니다.' };
  }

  try {
    if (!(await Sharing.isAvailableAsync())) return { kind: 'saved', uri };
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: '복약 기록 보내기',
      UTI: 'com.adobe.pdf',
    });
    return { kind: 'shared' };
  } catch {
    // 공유 화면을 사용자가 닫은 경우도 여기로 온다. 파일은 이미 만들어져 있다.
    return { kind: 'saved', uri };
  }
}

/** 바로 인쇄한다. 병원에 종이로 들고 갈 때. */
export async function printReport(report: Report): Promise<boolean> {
  try {
    await Print.printAsync({ html: renderReportHtml(report) });
    return true;
  } catch {
    return false;
  }
}

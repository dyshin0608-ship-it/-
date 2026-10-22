/** 복용 시각. 24시간제 "HH:MM" 문자열 (예: "08:00", "20:30"). */
export type TimeString = string;

/** 날짜. 기기 로컬 시간 기준 "YYYY-MM-DD" 문자열. */
export type DateString = string;

export type Medication = {
  id: string;
  /** 약 이름 */
  name: string;
  /** 하루 복용 시각 목록. 항상 오름차순으로 정렬해서 저장한다. */
  times: TimeString[];
  /** 복용 시작일 */
  startDate: DateString;
  /** 복용 종료일. null이면 종료일 없이 계속 복용. */
  endDate: DateString | null;
  createdAt: string;
  /**
   * 식약처 품목기준코드. 약 정보 화면으로 연결하는 데만 쓴다.
   * 선택 사항이라 이 필드가 없던 시절에 저장한 기록도 그대로 읽힌다.
   */
  drugSeq?: string;
};

/** 약을 새로 만들거나 수정할 때 폼이 돌려주는 값. */
export type MedicationInput = {
  name: string;
  times: TimeString[];
  startDate: DateString;
  endDate: DateString | null;
  drugSeq?: string;
};

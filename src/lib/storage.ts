import AsyncStorage from '@react-native-async-storage/async-storage';

import { sortTimes } from './date';
import type { Medication, MedicationInput } from './types';

/**
 * 약 목록은 기기 안에만 저장한다. 서버도 계정도 쓰지 않는다.
 * 키에 버전을 붙여 두어 나중에 구조가 바뀌어도 옮겨갈 수 있게 한다.
 */
const KEY = 'medi.medications.v1';

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** 저장된 값이 기대한 모양인지 확인한다. 깨진 항목은 조용히 버린다. */
function isMedication(value: unknown): value is Medication {
  if (typeof value !== 'object' || value === null) return false;
  const m = value as Record<string, unknown>;
  return (
    typeof m.id === 'string' &&
    typeof m.name === 'string' &&
    Array.isArray(m.times) &&
    m.times.every((t) => typeof t === 'string') &&
    typeof m.startDate === 'string' &&
    (m.endDate === null || typeof m.endDate === 'string')
  );
}

export async function getMedications(): Promise<Medication[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isMedication);
  } catch {
    // 저장된 내용이 깨졌더라도 앱이 멈추지는 않게 한다.
    return [];
  }
}

export async function getMedication(id: string): Promise<Medication | null> {
  const all = await getMedications();
  return all.find((m) => m.id === id) ?? null;
}

async function write(medications: Medication[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(medications));
}

export async function addMedication(input: MedicationInput): Promise<Medication> {
  const medication: Medication = {
    id: newId(),
    name: input.name.trim(),
    times: sortTimes(input.times),
    startDate: input.startDate,
    endDate: input.endDate,
    drugSeq: input.drugSeq,
    createdAt: new Date().toISOString(),
  };
  const all = await getMedications();
  await write([...all, medication]);
  return medication;
}

export async function updateMedication(id: string, input: MedicationInput): Promise<void> {
  const all = await getMedications();
  await write(
    all.map((m) =>
      m.id === id
        ? {
            ...m,
            name: input.name.trim(),
            times: sortTimes(input.times),
            startDate: input.startDate,
            endDate: input.endDate,
            drugSeq: input.drugSeq,
          }
        : m,
    ),
  );
}

export async function deleteMedication(id: string): Promise<void> {
  const all = await getMedications();
  await write(all.filter((m) => m.id !== id));
}

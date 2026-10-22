import { router } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { MedicationForm } from '../../src/components/MedicationForm';
import { addMedication } from '../../src/lib/storage';
import type { MedicationInput } from '../../src/lib/types';

export default function NewMedicationScreen() {
  const [saving, setSaving] = useState(false);

  async function handleSubmit(input: MedicationInput) {
    setSaving(true);
    try {
      await addMedication(input);
      router.back();
    } catch {
      setSaving(false);
      Alert.alert('저장하지 못했습니다', '잠시 후 다시 시도해 주세요.');
    }
  }

  return <MedicationForm submitLabel="저장" onSubmit={handleSubmit} saving={saving} />;
}

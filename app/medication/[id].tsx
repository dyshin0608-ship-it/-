import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';

import { MedicationForm } from '../../src/components/MedicationForm';
import { deleteMedication, getMedication, updateMedication } from '../../src/lib/storage';
import type { Medication, MedicationInput } from '../../src/lib/types';
import { colors, spacing } from '../../src/theme';

export default function EditMedicationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [medication, setMedication] = useState<Medication | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getMedication(id).then((found) => {
      if (cancelled) return;
      setMedication(found);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleSubmit(input: MedicationInput) {
    setSaving(true);
    try {
      await updateMedication(id, input);
      router.back();
    } catch {
      setSaving(false);
      Alert.alert('저장하지 못했습니다', '잠시 후 다시 시도해 주세요.');
    }
  }

  function handleDelete() {
    Alert.alert('이 약을 삭제할까요?', `${medication?.name ?? ''} 등록 내용이 지워집니다.`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          await deleteMedication(id);
          router.back();
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!medication) {
    return (
      <View style={styles.center}>
        <Text style={styles.missing}>약을 찾을 수 없습니다.</Text>
      </View>
    );
  }

  return (
    <MedicationForm
      medication={medication}
      submitLabel="저장"
      onSubmit={handleSubmit}
      onDelete={handleDelete}
      saving={saving}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  missing: { fontSize: 17, color: colors.muted },
});

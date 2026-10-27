import { StyleSheet, Text, View } from 'react-native';

import { IDtc } from '../../shared/interfaces/IDtc';
import { colors } from '../theme';

const SYSTEM_LABELS: Record<IDtc['system'], string> = {
  powertrain: 'Engine / transmission',
  chassis: 'Chassis',
  body: 'Body',
  network: 'Network / communication',
};

interface IDtcItemProps {
  dtc: IDtc;
  pending?: boolean;
}

export function DtcItem({ dtc, pending = false }: IDtcItemProps) {
  return (
    <View style={[styles.card, { borderLeftColor: pending ? colors.warning : colors.danger }]}>
      <View style={styles.header}>
        <Text style={styles.code}>{dtc.code}</Text>
        <Text style={styles.system}>{SYSTEM_LABELS[dtc.system]}</Text>
      </View>
      <Text style={styles.description}>{dtc.description ?? 'Manufacturer specific or unknown code'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderLeftWidth: 4,
    padding: 12,
    gap: 4,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  code: { color: colors.text, fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'] },
  system: { color: colors.textMuted, fontSize: 12 },
  description: { color: colors.text, fontSize: 14 },
});

import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { DiagnosticsService } from '../../obd/DiagnosticsService';
import { IDtcReport } from '../../shared/interfaces/IDtcReport';
import { Button } from '../components/Button';
import { DtcItem } from '../components/DtcItem';
import { errorMessage } from '../errorMessage';
import { colors } from '../theme';

interface IDtcScreenProps {
  service: DiagnosticsService;
  onDisconnect: () => void;
}

export function DtcScreen({ service, onDisconnect }: IDtcScreenProps) {
  const [report, setReport] = useState<IDtcReport | null>(null);
  const [action, setAction] = useState<'read' | 'clear' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (kind: 'read' | 'clear', task: () => Promise<void>) => {
    setAction(kind);
    setError(null);
    try {
      await task();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setAction(null);
    }
  }, []);

  const read = useCallback(
    () => run('read', async () => setReport(await service.readDtcs())),
    [run, service],
  );

  const clear = () =>
    Alert.alert(
      'Clear trouble codes?',
      'This also erases freeze frame data and resets readiness monitors. Engine off, ignition on.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () =>
            run('clear', async () => {
              await service.clearDtcs();
              setReport(await service.readDtcs());
            }),
        },
      ],
    );

  useEffect(() => {
    void read();
  }, [read]);

  const busy = action !== null;
  const hasCodes = report !== null && report.stored.length + report.pending.length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Trouble codes</Text>
          <Text style={styles.meta}>
            {service.adapterName} · {service.adapterVersion}
            {report && ` · read ${report.readAt.toLocaleTimeString()}`}
          </Text>
        </View>
        <Button title="Disconnect" variant="secondary" onPress={onDisconnect} disabled={busy} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {error && <Text style={styles.error}>{error}</Text>}

        {report && !hasCodes && <Text style={styles.ok}>No trouble codes 🎉</Text>}

        {report && report.stored.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Stored ({report.stored.length})</Text>
            {report.stored.map((dtc) => (
              <DtcItem key={dtc.code} dtc={dtc} />
            ))}
          </View>
        )}

        {report && report.pending.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pending ({report.pending.length})</Text>
            {report.pending.map((dtc) => (
              <DtcItem key={dtc.code} dtc={dtc} pending />
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.actions}>
        <Button title="Read codes" onPress={read} loading={action === 'read'} disabled={busy} />
        <Button title="Clear codes" variant="danger" onPress={clear} loading={action === 'clear'} disabled={busy || !hasCodes} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  title: { color: colors.text, fontSize: 24, fontWeight: '700' },
  meta: { color: colors.textMuted, fontSize: 12 },
  content: { gap: 16, paddingBottom: 16 },
  section: { gap: 8 },
  sectionTitle: { color: colors.textMuted, fontSize: 13, fontWeight: '600', textTransform: 'uppercase' },
  ok: { color: colors.success, fontSize: 18, textAlign: 'center', marginTop: 32 },
  error: { color: colors.danger, fontSize: 14 },
  actions: { gap: 8 },
});

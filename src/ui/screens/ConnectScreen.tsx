import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { connectObd } from '../../obd/connectObd';
import { DiagnosticsService } from '../../obd/DiagnosticsService';
import { BluetoothTransport } from '../../obd/transport/BluetoothTransport';
import { SimulatorTransport } from '../../obd/transport/SimulatorTransport';
import { IBluetoothDevice } from '../../shared/interfaces/IBluetoothDevice';
import { IObdTransport } from '../../shared/interfaces/IObdTransport';
import { Button } from '../components/Button';
import { errorMessage } from '../errorMessage';
import { colors } from '../theme';

interface IConnectScreenProps {
  onConnected: (service: DiagnosticsService) => void;
}

export function ConnectScreen({ onConnected }: IConnectScreenProps) {
  const bluetoothAvailable = BluetoothTransport.isAvailable();
  const [devices, setDevices] = useState<IBluetoothDevice[]>([]);
  const [connectingTo, setConnectingTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadDevices = useCallback(async () => {
    if (!bluetoothAvailable) return;
    setError(null);
    try {
      setDevices(await BluetoothTransport.listPairedDevices());
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [bluetoothAvailable]);

  useEffect(() => {
    void loadDevices();
  }, [loadDevices]);

  const connect = async (key: string, openTransport: () => Promise<IObdTransport>) => {
    setConnectingTo(key);
    setError(null);
    try {
      onConnected(await connectObd(await openTransport()));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setConnectingTo(null);
    }
  };

  const busy = connectingTo !== null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Connect adapter</Text>
      <Text style={styles.hint}>
        Pair the adapter in Android Bluetooth settings first (PIN usually 1234 or 0000), plug it in and turn the
        ignition on.
      </Text>

      {bluetoothAvailable ? (
        <FlatList
          style={styles.list}
          data={devices}
          keyExtractor={(device) => device.address}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.hint}>No paired devices.</Text>}
          renderItem={({ item }) => (
            <Pressable
              disabled={busy}
              onPress={() => connect(item.address, () => BluetoothTransport.connect(item))}
              style={({ pressed }) => [styles.device, pressed && styles.devicePressed]}
            >
              <View>
                <Text style={styles.deviceName}>{item.name}</Text>
                <Text style={styles.deviceAddress}>{item.address}</Text>
              </View>
              {connectingTo === item.address && <Text style={styles.connecting}>Connecting…</Text>}
            </Pressable>
          )}
        />
      ) : (
        <Text style={[styles.hint, styles.list]}>
          Bluetooth module is not in this build (Expo Go). Demo mode only — see README for a development build.
        </Text>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.actions}>
        {bluetoothAvailable && <Button title="Refresh devices" variant="secondary" onPress={loadDevices} disabled={busy} />}
        <Button
          title="Demo mode (simulator)"
          variant="secondary"
          loading={connectingTo === 'simulator'}
          disabled={busy}
          onPress={() => connect('simulator', async () => new SimulatorTransport())}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  title: { color: colors.text, fontSize: 24, fontWeight: '700' },
  hint: { color: colors.textMuted, fontSize: 14 },
  list: { flex: 1 },
  listContent: { gap: 8 },
  device: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 14,
  },
  devicePressed: { opacity: 0.8 },
  deviceName: { color: colors.text, fontSize: 16, fontWeight: '600' },
  deviceAddress: { color: colors.textMuted, fontSize: 12 },
  connecting: { color: colors.accent, fontSize: 14 },
  error: { color: colors.danger, fontSize: 14 },
  actions: { gap: 8 },
});

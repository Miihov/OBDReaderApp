import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { DiagnosticsService } from './src/obd/DiagnosticsService';
import { ConnectScreen } from './src/ui/screens/ConnectScreen';
import { DtcScreen } from './src/ui/screens/DtcScreen';
import { colors } from './src/ui/theme';

export default function App() {
  const [service, setService] = useState<DiagnosticsService | null>(null);

  const disconnect = async () => {
    await service?.disconnect().catch(() => undefined);
    setService(null);
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root}>
        <StatusBar style="light" />
        {service ? (
          <DtcScreen service={service} onDisconnect={disconnect} />
        ) : (
          <ConnectScreen onConnected={setService} />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
});

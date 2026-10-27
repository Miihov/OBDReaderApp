import { requireOptionalNativeModule } from 'expo';

import { IBluetoothDevice } from '../../src/shared/interfaces/IBluetoothDevice';

interface IObdBluetoothNativeModule {
  isEnabled(): Promise<boolean>;
  getBondedDevices(): Promise<IBluetoothDevice[]>;
  connect(address: string): Promise<void>;
  send(command: string, timeoutMs: number): Promise<string>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
}

/** Null when the native code is not part of the build (Expo Go, iOS, web) — only the simulator works then. */
export const ObdBluetooth = requireOptionalNativeModule<IObdBluetoothNativeModule>('ObdBluetooth');

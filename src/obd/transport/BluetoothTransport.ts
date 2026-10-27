import { PermissionsAndroid, Platform } from 'react-native';

import { ObdBluetooth } from '../../../modules/obd-bluetooth';
import { IBluetoothDevice } from '../../shared/interfaces/IBluetoothDevice';
import { IObdTransport } from '../../shared/interfaces/IObdTransport';

export class BluetoothTransport implements IObdTransport {
  private constructor(private readonly device: IBluetoothDevice) {}

  get name(): string {
    return this.device.name;
  }

  static isAvailable(): boolean {
    return ObdBluetooth !== null;
  }

  static async listPairedDevices(): Promise<IBluetoothDevice[]> {
    const native = BluetoothTransport.requireNative();
    await BluetoothTransport.ensurePermission();
    return native.getBondedDevices();
  }

  static async connect(device: IBluetoothDevice): Promise<BluetoothTransport> {
    const native = BluetoothTransport.requireNative();
    await BluetoothTransport.ensurePermission();
    await native.connect(device.address);
    return new BluetoothTransport(device);
  }

  send(command: string, timeoutMs: number): Promise<string> {
    return BluetoothTransport.requireNative().send(command, timeoutMs);
  }

  disconnect(): Promise<void> {
    return BluetoothTransport.requireNative().disconnect();
  }

  private static requireNative() {
    if (!ObdBluetooth) {
      throw new Error('Bluetooth module missing — run a development build, not Expo Go');
    }
    return ObdBluetooth;
  }

  /** Android 12+ (API 31) asks for BLUETOOTH_CONNECT at runtime; older versions grant it at install. */
  private static async ensurePermission(): Promise<void> {
    if (Platform.OS !== 'android' || Platform.Version < 31) return;

    const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT);
    if (result !== PermissionsAndroid.RESULTS.GRANTED) {
      throw new Error('Bluetooth permission denied');
    }
  }
}

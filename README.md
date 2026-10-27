# OBD Reader

Android app for reading and clearing OBD-II trouble codes (DTC) through an ELM327 Bluetooth adapter
(tested target: Vgate iCar2 Bluetooth). Built with Expo / React Native + TypeScript.

## Architecture

```
App.tsx                          screen switch: Connect -> Trouble codes
src/
  shared/interfaces, shared/types   types used in more than one place
  obd/
    transport/                    IObdTransport implementations
      BluetoothTransport.ts         real adapter, via the native module below
      SimulatorTransport.ts         fake ELM327 + CAN car, for development without a car
    Elm327Client.ts               AT init sequence, response cleaning, adapter errors
    DiagnosticsService.ts         read (modes 03 + 07) and clear (mode 04) trouble codes
    dtc/                          DTC byte decoding/parsing, generic descriptions
  ui/                             screens and components
modules/obd-bluetooth/            local Expo module (Kotlin): Bluetooth Classic SPP socket
```

The adapter uses Bluetooth Classic (SPP), not BLE, so it needs native code — `modules/obd-bluetooth`.
Each command is written as `<cmd>\r` and the response is read until the ELM327 `>` prompt.

## Scripts

```bash
npm start           # Metro dev server
npm test            # Jest (codec + simulator end-to-end)
npm run typecheck
npm run android     # local native build + install on a USB-connected phone (needs Android Studio)
```

## Running

**Demo mode in Expo Go** (no Bluetooth, no Android SDK needed): install Expo Go on the phone, `npm start`,
scan the QR code, tap *Demo mode*.

**With the real adapter** the native module must be compiled in, pick one:

- *Cloud APK (no Android Studio)*: `npx eas-cli@latest build -p android --profile preview` (free Expo account),
  then install the APK from the link on the phone.
- *Local*: install Android Studio (bundles JDK + SDK), enable USB debugging on the phone, `npm run android`.

Before connecting: pair the adapter in Android Bluetooth settings (PIN `1234` or `0000`), plug it into the
OBD port and turn the ignition on. Clearing codes works best with the engine off and ignition on.

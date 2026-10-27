package expo.modules.obdbluetooth

import android.annotation.SuppressLint
import android.bluetooth.BluetoothManager
import android.content.Context
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

internal class BluetoothUnavailableException :
  CodedException("Bluetooth is not available on this device")

internal class BluetoothDisabledException :
  CodedException("Bluetooth is turned off")

// Permission (BLUETOOTH_CONNECT) is requested from JS before any call here,
// so lint's MissingPermission warnings are suppressed.
@SuppressLint("MissingPermission")
class ObdBluetoothModule : Module() {
  private val connection = SppConnection()

  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private val adapter
    get() = (context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager)?.adapter
      ?: throw BluetoothUnavailableException()

  override fun definition() = ModuleDefinition {
    Name("ObdBluetooth")

    AsyncFunction("isEnabled") {
      adapter.isEnabled
    }

    AsyncFunction("getBondedDevices") {
      if (!adapter.isEnabled) throw BluetoothDisabledException()
      adapter.bondedDevices.map { device ->
        mapOf("name" to (device.name ?: device.address), "address" to device.address)
      }
    }

    AsyncFunction("connect") Coroutine { address: String ->
      if (!adapter.isEnabled) throw BluetoothDisabledException()
      val device = adapter.getRemoteDevice(address)
      withContext(Dispatchers.IO) {
        // Discovery slows down RFCOMM connections considerably
        adapter.cancelDiscovery()
        connection.open(device)
      }
    }

    AsyncFunction("send") Coroutine { command: String, timeoutMs: Int ->
      withContext(Dispatchers.IO) {
        connection.send(command, timeoutMs.toLong())
      }
    }

    AsyncFunction("disconnect") {
      connection.close()
    }

    Function("isConnected") {
      connection.isOpen
    }

    OnDestroy {
      connection.close()
    }
  }
}

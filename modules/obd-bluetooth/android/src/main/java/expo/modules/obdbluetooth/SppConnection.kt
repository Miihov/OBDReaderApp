package expo.modules.obdbluetooth

import android.annotation.SuppressLint
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothSocket
import expo.modules.kotlin.exception.CodedException
import java.io.IOException
import java.util.UUID

internal class ConnectFailedException(cause: Throwable?) :
  CodedException("Could not connect to the adapter: ${cause?.message}", cause)

internal class NotConnectedException :
  CodedException("Adapter is not connected")

internal class ResponseTimeoutException(partial: String) :
  CodedException("No prompt from adapter in time, received: '$partial'")

/**
 * A single RFCOMM (Serial Port Profile) link to an ELM327 adapter.
 * Commands are strictly request/response: write a line, read until the '>' prompt.
 */
@SuppressLint("MissingPermission")
internal class SppConnection {
  private var socket: BluetoothSocket? = null
  private val lock = Any()

  val isOpen: Boolean
    get() = socket?.isConnected == true

  fun open(device: BluetoothDevice) = synchronized(lock) {
    closeQuietly()
    socket = try {
      device.createRfcommSocketToServiceRecord(SPP_UUID).also { it.connect() }
    } catch (e: IOException) {
      // Some cheap clones only accept insecure sockets
      try {
        device.createInsecureRfcommSocketToServiceRecord(SPP_UUID).also { it.connect() }
      } catch (fallback: IOException) {
        throw ConnectFailedException(fallback)
      }
    }
  }

  fun send(command: String, timeoutMs: Long): String = synchronized(lock) {
    val current = socket?.takeIf { it.isConnected } ?: throw NotConnectedException()
    val input = current.inputStream
    val output = current.outputStream

    // Drop leftovers from a previous, timed-out command
    while (input.available() > 0) input.read()

    output.write("$command\r".toByteArray(Charsets.US_ASCII))
    output.flush()

    val response = StringBuilder()
    val deadline = System.currentTimeMillis() + timeoutMs
    while (System.currentTimeMillis() < deadline) {
      if (input.available() > 0) {
        val char = input.read().toChar()
        if (char == PROMPT) return response.toString()
        response.append(char)
      } else {
        Thread.sleep(POLL_INTERVAL_MS)
      }
    }
    throw ResponseTimeoutException(response.toString())
  }

  fun close() = synchronized(lock) { closeQuietly() }

  private fun closeQuietly() {
    try {
      socket?.close()
    } catch (_: IOException) {
    }
    socket = null
  }

  companion object {
    private val SPP_UUID: UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")
    private const val PROMPT = '>'
    private const val POLL_INTERVAL_MS = 10L
  }
}

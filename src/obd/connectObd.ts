import { IObdTransport } from '../shared/interfaces/IObdTransport';
import { DiagnosticsService } from './DiagnosticsService';
import { Elm327Client } from './Elm327Client';

/** Initializes the adapter on an open transport; closes the transport if that fails. */
export async function connectObd(transport: IObdTransport): Promise<DiagnosticsService> {
  const client = new Elm327Client(transport);
  try {
    await client.initialize();
  } catch (error) {
    await transport.disconnect().catch(() => undefined);
    throw error;
  }
  return new DiagnosticsService(client);
}

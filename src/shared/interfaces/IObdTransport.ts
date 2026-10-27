/**
 * Raw line-based link to an ELM327 adapter (Bluetooth, simulator, ...).
 * `send` writes one command and resolves with everything the adapter printed before its '>' prompt.
 */
export interface IObdTransport {
  readonly name: string;
  send(command: string, timeoutMs: number): Promise<string>;
  disconnect(): Promise<void>;
}

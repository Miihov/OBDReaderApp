import { IObdTransport } from '../shared/interfaces/IObdTransport';

const DEFAULT_TIMEOUT_MS = 5000;
/** First OBD request triggers automatic protocol search, which can take several seconds. */
const PROTOCOL_SEARCH_TIMEOUT_MS = 20000;

const NO_DATA = 'NODATA';
const ERROR_MESSAGES: Record<string, string> = {
  '?': 'Adapter did not understand the command',
  UNABLETOCONNECT: 'Car not responding — is the ignition on?',
  BUSINIT: 'Car not responding — is the ignition on?',
  CANERROR: 'CAN bus error',
  BUSERROR: 'Bus error',
  BUSBUSY: 'Bus busy',
  STOPPED: 'Request interrupted',
  ERROR: 'Adapter error',
};

export class ObdError extends Error {}

/** Speaks the ELM327 AT/OBD dialect over any IObdTransport. */
export class Elm327Client {
  private canProtocol = true;
  private version = '';

  constructor(private readonly transport: IObdTransport) {}

  get isCan(): boolean {
    return this.canProtocol;
  }

  get adapterVersion(): string {
    return this.version;
  }

  get transportName(): string {
    return this.transport.name;
  }

  async initialize(): Promise<void> {
    // Reset: echo is still on at this point and gets filtered by clean()
    const reset = await this.command('ATZ');
    this.version = reset.find((line) => line.startsWith('ELM')) ?? 'unknown';

    for (const setting of ['ATE0', 'ATL0', 'ATS0', 'ATH0', 'ATSP0']) {
      await this.command(setting);
    }

    // Supported PIDs request — also forces the adapter to find and lock the car's protocol
    await this.query('0100', PROTOCOL_SEARCH_TIMEOUT_MS);

    const [protocol = ''] = await this.command('ATDPN');
    this.canProtocol = isCanProtocol(protocol);
  }

  /** OBD request. Returns cleaned response lines, empty array on "NO DATA". */
  async query(request: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<string[]> {
    const lines = await this.command(request, timeoutMs);
    if (lines.some((line) => line.replace(/\s/g, '') === NO_DATA)) return [];
    return lines;
  }

  async disconnect(): Promise<void> {
    await this.transport.disconnect();
  }

  private async command(command: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<string[]> {
    const raw = await this.transport.send(command, timeoutMs);
    const lines = clean(raw, command);
    assertNoError(lines);
    return lines;
  }
}

function clean(raw: string, command: string): string[] {
  return raw
    .split(/[\r\n]+/)
    .map((line) => line.trim())
    .filter((line) => line !== '' && line !== command && !line.startsWith('SEARCHING'));
}

function assertNoError(lines: string[]): void {
  for (const line of lines) {
    const compact = line.replace(/[\s.:]/g, '').toUpperCase();
    const key = Object.keys(ERROR_MESSAGES).find((error) =>
      error === '?' ? compact === '?' : compact.startsWith(error),
    );
    if (key) throw new ObdError(ERROR_MESSAGES[key]);
  }
}

/** ATDPN answers e.g. "A6" (auto-detected protocol 6) or "6". Protocols 6-C are CAN based. */
function isCanProtocol(dpn: string): boolean {
  const protocol = dpn.length === 2 && dpn.startsWith('A') ? dpn[1] : dpn;
  return /^[6-9A-C]$/.test(protocol);
}

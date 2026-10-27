import { IObdTransport } from '../../shared/interfaces/IObdTransport';
import { encodeDtc } from '../dtc/dtcCodec';

interface ISimulatorOptions {
  storedDtcs: string[];
  pendingDtcs: string[];
  responseDelayMs: number;
  protocolSearchDelayMs: number;
}

const DEFAULT_OPTIONS: ISimulatorOptions = {
  storedDtcs: ['P0133', 'P0420', 'P0301', 'U0100'],
  pendingDtcs: ['P0171'],
  responseDelayMs: 120,
  protocolSearchDelayMs: 1500,
};

/**
 * Fake ELM327 + CAN car, answering like the real adapter does (echo until ATE0, protocol search,
 * ISO-TP multi-frame for longer DTC lists), so the whole stack can be developed without a car.
 */
export class SimulatorTransport implements IObdTransport {
  readonly name = 'Simulator';

  private echo = true;
  private spaces = true;
  private protocolFound = false;
  private storedDtcs: string[];
  private pendingDtcs: string[];
  private readonly options: ISimulatorOptions;

  constructor(options: Partial<ISimulatorOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.storedDtcs = [...this.options.storedDtcs];
    this.pendingDtcs = [...this.options.pendingDtcs];
  }

  async send(command: string): Promise<string> {
    const request = command.trim().toUpperCase();
    const searching = /^0[1-9A]/.test(request) && !this.protocolFound;
    await delay(searching ? this.options.protocolSearchDelayMs : this.options.responseDelayMs);

    const lines = this.respond(request, searching);
    if (this.echo) lines.unshift(command);
    return lines.join('\r') + '\r\r';
  }

  async disconnect(): Promise<void> {}

  private respond(request: string, searching: boolean): string[] {
    if (request.startsWith('AT')) return this.respondAt(request.slice(2));

    if (searching) this.protocolFound = true;
    const prefix = searching ? ['SEARCHING...'] : [];

    switch (request) {
      case '0100':
        return [...prefix, this.format('4100BE3FA813')];
      case '03':
        return [...prefix, ...this.dtcFrames('43', this.storedDtcs)];
      case '07':
        return [...prefix, ...this.dtcFrames('47', this.pendingDtcs)];
      case '04':
        this.storedDtcs = [];
        this.pendingDtcs = [];
        return [...prefix, '44'];
      default:
        return [...prefix, 'NO DATA'];
    }
  }

  private respondAt(command: string): string[] {
    switch (command) {
      case 'Z':
        this.echo = true;
        this.spaces = true;
        this.protocolFound = false;
        return ['', 'ELM327 v1.5'];
      case 'E0':
        this.echo = false;
        return ['OK'];
      case 'S0':
        this.spaces = false;
        return ['OK'];
      case 'DPN':
        return [this.protocolFound ? 'A6' : 'A0'];
      default:
        return ['OK'];
    }
  }

  /** Single frame fits 7 bytes; above that ELM prints byte count + numbered ISO-TP frames. */
  private dtcFrames(responseMode: string, codes: string[]): string[] {
    const bytes = [responseMode, toHex(codes.length), ...codes.flatMap((code) => splitBytes(encodeDtc(code)))];
    if (bytes.length <= 7) return [this.format(bytes.join(''))];

    const frames = [toHex(bytes.length, 3)];
    frames.push(`0:${this.format(bytes.slice(0, 6).join(''))}`);
    for (let i = 6, index = 1; i < bytes.length; i += 7, index++) {
      const chunk = bytes.slice(i, i + 7);
      while (chunk.length < 7) chunk.push('00');
      frames.push(`${(index % 16).toString(16).toUpperCase()}:${this.format(chunk.join(''))}`);
    }
    return frames;
  }

  private format(hex: string): string {
    return this.spaces ? splitBytes(hex).join(' ') : hex;
  }
}

function splitBytes(hex: string): string[] {
  return hex.match(/.{2}/g) ?? [];
}

function toHex(value: number, width = 2): string {
  return value.toString(16).toUpperCase().padStart(width, '0');
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

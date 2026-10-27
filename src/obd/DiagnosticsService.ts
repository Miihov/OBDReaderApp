import { IDtc } from '../shared/interfaces/IDtc';
import { IDtcReport } from '../shared/interfaces/IDtcReport';
import { dtcSystem, parseDtcResponse } from './dtc/dtcCodec';
import { describeDtc } from './dtc/dtcDescriptions';
import { Elm327Client, ObdError } from './Elm327Client';

/** OBD-II service ids (modes) and the response id the ECU answers with (+0x40). */
const MODE = {
  storedDtcs: { request: '03', response: '43' },
  clearDtcs: { request: '04', response: '44' },
  pendingDtcs: { request: '07', response: '47' },
} as const;

export class DiagnosticsService {
  constructor(private readonly client: Elm327Client) {}

  get adapterName(): string {
    return this.client.transportName;
  }

  get adapterVersion(): string {
    return this.client.adapterVersion;
  }

  async readDtcs(): Promise<IDtcReport> {
    // Sequential on purpose: ELM327 handles one request at a time
    const stored = await this.readCodes(MODE.storedDtcs);
    const pending = await this.readCodes(MODE.pendingDtcs);
    return { stored, pending, readAt: new Date() };
  }

  /** Clears stored + pending codes, freeze frame and resets readiness monitors. */
  async clearDtcs(): Promise<void> {
    const lines = await this.client.query(MODE.clearDtcs.request);
    if (!lines.some((line) => line.startsWith(MODE.clearDtcs.response))) {
      throw new ObdError('Car refused to clear codes — turn the engine off, keep the ignition on');
    }
  }

  disconnect(): Promise<void> {
    return this.client.disconnect();
  }

  private async readCodes(mode: { request: string; response: string }): Promise<IDtc[]> {
    const lines = await this.client.query(mode.request);
    return parseDtcResponse(lines, mode.response, this.client.isCan).map((code) => ({
      code,
      system: dtcSystem(code),
      description: describeDtc(code),
    }));
  }
}

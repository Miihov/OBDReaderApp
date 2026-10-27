import { IObdTransport } from '../shared/interfaces/IObdTransport';
import { connectObd } from './connectObd';
import { ObdError } from './Elm327Client';
import { SimulatorTransport } from './transport/SimulatorTransport';

const instant = { responseDelayMs: 0, protocolSearchDelayMs: 0 };

describe('DiagnosticsService with simulator', () => {
  it('initializes the adapter', async () => {
    const service = await connectObd(new SimulatorTransport(instant));
    expect(service.adapterVersion).toBe('ELM327 v1.5');
    expect(service.adapterName).toBe('Simulator');
  });

  it('reads stored and pending codes (incl. multi-frame)', async () => {
    const service = await connectObd(
      new SimulatorTransport({ ...instant, storedDtcs: ['P0133', 'P0420', 'P0301', 'U0100'], pendingDtcs: ['P0171'] }),
    );

    const report = await service.readDtcs();

    expect(report.stored.map((dtc) => dtc.code)).toEqual(['P0133', 'P0420', 'P0301', 'U0100']);
    expect(report.pending).toEqual([
      { code: 'P0171', system: 'powertrain', description: 'System too lean (bank 1)' },
    ]);
    expect(report.stored[3]).toMatchObject({ system: 'network', description: null });
  });

  it('clears codes', async () => {
    const service = await connectObd(new SimulatorTransport(instant));

    await service.clearDtcs();
    const report = await service.readDtcs();

    expect(report.stored).toEqual([]);
    expect(report.pending).toEqual([]);
  });
});

describe('error handling', () => {
  const transportAnswering = (answer: (command: string) => string): IObdTransport & { disconnect: jest.Mock } => ({
    name: 'fake',
    send: async (command) => answer(command),
    disconnect: jest.fn(async () => undefined),
  });

  it('reports ignition off and closes the transport', async () => {
    const transport = transportAnswering((command) => (command === '0100' ? 'SEARCHING...\rUNABLE TO CONNECT\r' : 'OK'));

    await expect(connectObd(transport)).rejects.toThrow(new ObdError('Car not responding — is the ignition on?'));
    expect(transport.disconnect).toHaveBeenCalled();
  });

  it('treats NO DATA as no codes', async () => {
    const transport = transportAnswering((command) => {
      if (command === '0100') return '4100BE3FA813';
      if (command === 'ATDPN') return 'A6';
      if (command === '03' || command === '07') return 'NO DATA';
      return 'OK';
    });

    const report = await (await connectObd(transport)).readDtcs();
    expect(report.stored).toEqual([]);
    expect(report.pending).toEqual([]);
  });
});

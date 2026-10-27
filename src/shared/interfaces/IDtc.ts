import { TDtcSystem } from '../types/TDtcSystem';

export interface IDtc {
  /** e.g. "P0133" */
  code: string;
  system: TDtcSystem;
  /** Generic SAE description, null when unknown (e.g. manufacturer specific codes). */
  description: string | null;
}

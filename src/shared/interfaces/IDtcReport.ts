import { IDtc } from './IDtc';

export interface IDtcReport {
  /** Confirmed codes, mode 03 — these usually light the check engine lamp. */
  stored: IDtc[];
  /** Codes detected in the current/last drive cycle but not confirmed yet, mode 07. */
  pending: IDtc[];
  readAt: Date;
}

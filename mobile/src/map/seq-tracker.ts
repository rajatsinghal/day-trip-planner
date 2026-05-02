// Mirrors the per-message-type seq filter implemented inside
// map.template.html. Lives on the native side as a small standalone
// module so the bridge-handshake smoke test can verify the
// stale-seq-drop semantics without spinning up a WebView.
//
// Production note: this module is intentionally not used by
// MapWebView itself — the actual filter runs inside the WebView. We
// keep this here as a (a) reference implementation, (b) test target.

import type { NativeToMap } from './bridge-protocol';

type MessageType = NativeToMap['type'];

const SEQ_TYPES: MessageType[] = [
  'INIT',
  'SET_PINS',
  'FLY_TO',
  'SET_SELECTED',
  'SET_STYLE',
  'HEARTBEAT',
];

export class SeqTracker {
  private last: Record<MessageType, number>;

  constructor() {
    this.last = SEQ_TYPES.reduce(
      (acc, t) => {
        acc[t] = 0;
        return acc;
      },
      {} as Record<MessageType, number>,
    );
  }

  /**
   * Apply a message; returns true if accepted, false if dropped as stale.
   * INIT additionally resets every other counter (a fresh INIT means
   * the hub may have changed; the WebView restarts its own seq tracking).
   */
  apply(msg: NativeToMap): boolean {
    const t = msg.type;
    if (msg.seq <= this.last[t]) return false;
    this.last[t] = msg.seq;
    if (t === 'INIT') {
      for (const other of SEQ_TYPES) {
        if (other !== 'INIT') this.last[other] = 0;
      }
    }
    return true;
  }

  get(t: MessageType): number {
    return this.last[t];
  }
}

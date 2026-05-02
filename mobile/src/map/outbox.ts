// Pure-logic outbox for the native → map bridge. Extracted out of
// MapWebView so it can be unit-tested without rendering React Native.
//
// The outbox owns:
//   - the queue of unstamped messages
//   - the monotonic seq counter
//   - the gating logic ("don't send anything until MAP_READY";
//     "before MAP_INITIALIZED, only INIT may go through")
//
// MapWebView wires this to the actual WebView via `send` callback;
// tests pass a spy.

import type { NativeToMap } from './bridge-protocol';

// Distributive Omit so each variant of the union loses its `seq` field
// individually. `Omit<NativeToMap, 'seq'>` collapses to a non-discriminated
// shape and rejects literal-typed fields like `hubId`.
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never;

export type UnstampedMessage = DistributiveOmit<NativeToMap, 'seq'>;

export interface OutboxOptions {
  /**
   * Function called when a stamped message is ready to be sent over
   * the wire. In production this is `webViewRef.injectJavaScript`;
   * in tests it's a spy.
   */
  send: (msg: NativeToMap) => void;
  /**
   * Scheduler used between flushes. Defaults to `setTimeout(fn, 0)`.
   * Tests pass a synchronous scheduler so they don't need fake timers.
   *
   * NOTE: production must use setTimeout, NOT requestAnimationFrame —
   * rAF doesn't exist on the native JS thread. See MOBILE_PLAN.md §4.6.
   */
  schedule?: (fn: () => void) => void;
}

export class Outbox {
  private queue: UnstampedMessage[] = [];
  private seq = 0;
  private mapReady = false;
  private mapInitialized = false;
  private flushScheduled = false;
  private send: (msg: NativeToMap) => void;
  private schedule: (fn: () => void) => void;

  constructor(opts: OutboxOptions) {
    this.send = opts.send;
    // Default scheduler: setTimeout. Explicitly NOT rAF.
    this.schedule = opts.schedule ?? ((fn) => { setTimeout(fn, 0); });
  }

  /** Returns the seq counter — for tests. */
  get currentSeq(): number {
    return this.seq;
  }

  /** Returns the queue length — for tests. */
  get pendingCount(): number {
    return this.queue.length;
  }

  isMapReady(): boolean {
    return this.mapReady;
  }

  isMapInitialized(): boolean {
    return this.mapInitialized;
  }

  /** Native learns MAP_READY from the WebView — start flushing. */
  onMapReady(): void {
    this.mapReady = true;
    this.scheduleFlush();
  }

  /** Map is fully ready (style loaded). Open the gate for non-INIT messages. */
  onMapInitialized(): void {
    this.mapInitialized = true;
    this.scheduleFlush();
  }

  /** Reset state for a webview reload. Clears queue and flags. */
  reset(): void {
    this.queue = [];
    this.mapReady = false;
    this.mapInitialized = false;
    this.flushScheduled = false;
    // seq is intentionally NOT reset — it's monotonic across reloads
    // so the WebView can distinguish "first INIT for hub A" from
    // "second INIT after reload for hub A".
  }

  /** Append a message to the outbox. */
  enqueue(msg: UnstampedMessage): void {
    this.queue.push(msg);
    this.scheduleFlush();
  }

  /** Push a message to the front of the outbox. Used for INIT after MAP_READY. */
  prepend(msg: UnstampedMessage): void {
    this.queue.unshift(msg);
    this.scheduleFlush();
  }

  private scheduleFlush(): void {
    if (this.flushScheduled) return;
    this.flushScheduled = true;
    this.schedule(() => this.flushNext());
  }

  private flushNext(): void {
    this.flushScheduled = false;
    if (!this.mapReady) return;

    // Sync drain while the gate is open. Re-scheduling via setTimeout
    // is only needed when the gate is closed (waiting for INIT).
    while (this.queue.length > 0) {
      const next = this.queue[0];
      if (!this.mapInitialized && next.type !== 'INIT') {
        // Gate closed for non-INIT — wait for onMapInitialized.
        return;
      }
      this.queue.shift();
      const stamped: NativeToMap = { ...(next as NativeToMap), seq: ++this.seq };
      this.send(stamped);
    }
  }
}

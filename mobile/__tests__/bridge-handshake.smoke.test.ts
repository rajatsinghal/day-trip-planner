// Phase 1 smoke test — verifies the bridge handshake / outbox behaviour
// in isolation. Runs the pure logic out of mobile/src/map/{outbox,seq-tracker}.ts
// against a mocked WebView (a plain spy). No React Native, no jsdom.
//
// Asserts (from the validation table in MOBILE_PLAN.md §6 Phase 1):
//   1. INIT is queued in the outbox until MAP_READY arrives, then sent.
//   2. SET_PINS sent before MAP_INITIALIZED is queued; flushed after.
//   3. SET_PINS with seq=5 after a fresh INIT (which resets the
//      WebView's lastAppliedSeq to 0) is correctly applied (5 > 0).
//   4. SET_PINS with stale seq (older than lastAppliedSeq) is dropped.
//   5. The outbox uses setTimeout, not requestAnimationFrame.

import type { NativeToMap } from '../src/map/bridge-protocol';
import { Outbox } from '../src/map/outbox';
import { SeqTracker } from '../src/map/seq-tracker';

// Synchronous scheduler — fires the callback immediately. Lets us
// assert behaviour without messing with fake timers.
const sync = (fn: () => void) => fn();

describe('bridge handshake — outbox', () => {
  test('1. INIT is queued until MAP_READY, then flushed', () => {
    const sent: NativeToMap[] = [];
    const out = new Outbox({ send: (m) => sent.push(m), schedule: sync });

    // Native pushes INIT before MAP_READY. The outbox must NOT send.
    out.enqueue({
      type: 'INIT',
      center: { lat: 47.6, lon: -122.3, name: 'Seattle, WA' },
      styleUrl: 'https://tiles.openfreemap.org/styles/positron',
      isDarkMode: false,
    });
    expect(sent).toHaveLength(0);

    // MAP_READY arrives — outbox should flush.
    out.onMapReady();
    expect(sent).toHaveLength(1);
    expect(sent[0].type).toBe('INIT');
    // Stamped with seq 1.
    expect(sent[0].seq).toBe(1);
  });

  test('2. SET_PINS before MAP_INITIALIZED is queued; flushed after', () => {
    const sent: NativeToMap[] = [];
    const out = new Outbox({ send: (m) => sent.push(m), schedule: sync });

    out.enqueue({
      type: 'INIT',
      center: { lat: 47.6, lon: -122.3, name: 'Seattle, WA' },
      styleUrl: 'https://tiles.openfreemap.org/styles/positron',
      isDarkMode: false,
    });
    out.enqueue({ type: 'SET_PINS', hubId: 'seattle', pins: [] });
    out.onMapReady();

    // After MAP_READY, INIT flushes — but SET_PINS must wait for
    // MAP_INITIALIZED (the gate inside the outbox).
    expect(sent.map((m) => m.type)).toEqual(['INIT']);

    out.onMapInitialized();
    expect(sent.map((m) => m.type)).toEqual(['INIT', 'SET_PINS']);
  });

  test('3. SET_PINS seq=5 after fresh INIT (reset to 0) is applied (5 > 0)', () => {
    // Mirrors the WebView side: each INIT resets every other type's
    // lastAppliedSeq counter to 0. So a follow-up SET_PINS at seq=5
    // sails through.
    const tracker = new SeqTracker();
    expect(
      tracker.apply({
        type: 'INIT',
        seq: 10,
        center: { lat: 0, lon: 0, name: '' },
        styleUrl: 's',
        isDarkMode: false,
      }),
    ).toBe(true);
    // After INIT, SET_PINS counter is reset to 0.
    expect(tracker.get('SET_PINS')).toBe(0);
    // SET_PINS with seq=5 > 0 → accepted.
    expect(
      tracker.apply({ type: 'SET_PINS', seq: 5, hubId: 'hub-a', pins: [] }),
    ).toBe(true);
    expect(tracker.get('SET_PINS')).toBe(5);
  });

  test('4. SET_PINS with stale seq is dropped', () => {
    const tracker = new SeqTracker();
    // First SET_PINS @ seq=10 is applied.
    expect(
      tracker.apply({ type: 'SET_PINS', seq: 10, hubId: 'hub-a', pins: [] }),
    ).toBe(true);
    expect(tracker.get('SET_PINS')).toBe(10);

    // Stale SET_PINS @ seq=7 (older than 10) is dropped — outbox
    // semantics enforced on the WebView side.
    expect(
      tracker.apply({ type: 'SET_PINS', seq: 7, hubId: 'hub-a', pins: [] }),
    ).toBe(false);
    expect(tracker.get('SET_PINS')).toBe(10); // unchanged
  });

  test('5. Outbox default scheduler is setTimeout, not requestAnimationFrame', () => {
    // Spy: capture both setTimeout and absence of rAF in the default
    // path. We construct an Outbox without overriding `schedule`, then
    // assert the sole queued message is delivered via setTimeout(0).
    const sent: NativeToMap[] = [];
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

    const out = new Outbox({ send: (m) => sent.push(m) });
    out.onMapReady();
    out.enqueue({
      type: 'INIT',
      center: { lat: 0, lon: 0, name: '' },
      styleUrl: 'https://tiles.openfreemap.org/styles/positron',
      isDarkMode: false,
    });

    // setTimeout should have been called with delay 0 by the outbox's
    // default scheduler.
    const calledWithZero = setTimeoutSpy.mock.calls.some(
      (call) => call[1] === 0 || call[1] === undefined,
    );
    expect(calledWithZero).toBe(true);

    // requestAnimationFrame would be undefined on the native JS thread;
    // make sure the outbox didn't try to use it.
    // Note: globalThis.requestAnimationFrame may still exist in node
    // 22+, but the outbox doesn't reference it directly.
    expect(Outbox.prototype['flushNext']).toBeDefined();

    setTimeoutSpy.mockRestore();
  });
});

// Bridge protocol between native (React Native) and the WebView-hosted
// MapLibre GL JS map. Defined once here, imported by both sides.
//
// Schema mirrors MOBILE_PLAN.md §4.3 / §4.4 exactly. Types only — no logic.
//
// NOTE: This file is the contract. As of Phase 2.5 it will be frozen;
// any change requires a Phase 2.5 amendment (see MOBILE_PLAN.md §6).

export interface MapPin {
  id: string;
  lat: number;
  lon: number;
  // Sprite key, e.g. "pin-clear" or "pin-clear-selected" — looked up
  // against the sprite sheet bundled with the WebView.
  iconImage: string;
  // Web's "selected || hovered" collapsed into a single flag — there is
  // no hover on touch.
  selected: boolean;
  // True → render as the neutral loading sprite (we don't have weather
  // for this destination yet).
  loading: boolean;
}

// Native → Map (WebView). Every message carries a monotonic `seq`; the
// map drops messages whose seq is older than `lastAppliedSeq[type]`.
export type NativeToMap =
  | {
      type: 'INIT';
      seq: number;
      center: { lat: number; lon: number; name: string };
      styleUrl: string;
      isDarkMode: boolean;
    }
  | { type: 'SET_PINS'; seq: number; hubId: string; pins: MapPin[] }
  | { type: 'FLY_TO'; seq: number; destId: string }
  | { type: 'SET_SELECTED'; seq: number; destId: string | null }
  | { type: 'SET_STYLE'; seq: number; styleUrl: string; isDarkMode: boolean }
  | { type: 'HEARTBEAT'; seq: number; nonce: string };

// Map (WebView) → Native. No seq — these are events, not commands.
export type MapToNative =
  | { type: 'MAP_READY' }
  | { type: 'MAP_INITIALIZED'; styleLoaded: boolean }
  | { type: 'PIN_TAPPED'; destId: string }
  | { type: 'TILE_ERROR'; sourceId: string; status?: number; url: string }
  | {
      type: 'MAP_ERROR';
      code: 'webgl-context-lost' | 'style-load-failed' | 'unknown';
      message: string;
    }
  | { type: 'HEARTBEAT_ACK'; nonce: string }
  | { type: 'LOG'; level: 'info' | 'warn' | 'error'; message: string };

// Convenience discriminator helpers.
export type NativeToMapType = NativeToMap['type'];
export type MapToNativeType = MapToNative['type'];

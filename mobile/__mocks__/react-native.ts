// Minimal mock for react-native to satisfy imports in Jest.
// Phase 3 expanded this to cover the components and APIs the UI imports.
import * as React from 'react';

export const Platform = {
  OS: 'ios' as 'ios' | 'android',
  select: (obj: Record<string, unknown>) => obj.ios ?? obj.default,
  isPad: false,
};

export const NativeModules = {};

// StyleSheet — passthrough so styles.X resolves.
export const StyleSheet = {
  create: <T extends Record<string, unknown>>(styles: T): T => styles,
  flatten: (style: unknown) => style,
  hairlineWidth: 1,
  absoluteFillObject: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
};

// Component stubs — render their children via React.createElement so the
// tree can mount in the node test environment without a real native bridge.
type AnyProps = Record<string, unknown> & { children?: React.ReactNode };

const stub = (name: string) => {
  const Component: React.FC<AnyProps> = (props) =>
    React.createElement(name as any, props, props.children);
  Component.displayName = name;
  return Component;
};

export const View = stub('View');
export const Text = stub('Text');
export const Pressable = stub('Pressable');
export const TouchableOpacity = stub('TouchableOpacity');
export const TouchableHighlight = stub('TouchableHighlight');
export const ScrollView = stub('ScrollView');
export const SafeAreaView = stub('SafeAreaView');
export const Modal = stub('Modal');
export const Image = stub('Image');
export const ImageBackground = stub('ImageBackground');
export const ActivityIndicator = stub('ActivityIndicator');
export const KeyboardAvoidingView = stub('KeyboardAvoidingView');
export const RefreshControl = stub('RefreshControl');
export const StatusBar = stub('StatusBar');

// FlatList stub — exposes a no-op imperative ref.
export const FlatList = React.forwardRef<unknown, AnyProps>(
  (props, ref) => {
    React.useImperativeHandle(ref, () => ({
      scrollToIndex: () => {},
      scrollToOffset: () => {},
      scrollToItem: () => {},
      scrollToEnd: () => {},
      recordInteraction: () => {},
      getScrollResponder: () => null,
    }));
    return React.createElement('FlatList' as any, props, props.children as React.ReactNode);
  },
);
(FlatList as unknown as { displayName: string }).displayName = 'FlatList';

// AppState — used by MapWebView; tests mostly don't exercise it.
export const AppState = {
  currentState: 'active',
  addEventListener: (_event: string, _handler: (...args: unknown[]) => void) => ({
    remove: () => {},
  }),
  removeEventListener: () => {},
};

// Linking — used by MobileDetailSheet for "Open in Google Maps".
export const Linking = {
  openURL: async (_url: string) => true,
  canOpenURL: async (_url: string) => true,
  getInitialURL: async () => null,
  addEventListener: () => ({ remove: () => {} }),
};

// Dimensions — used by responsive layouts.
export const Dimensions = {
  get: (_screen: 'window' | 'screen') => ({ width: 390, height: 844, scale: 2, fontScale: 1 }),
  addEventListener: () => ({ remove: () => {} }),
};

export const useWindowDimensions = () => ({ width: 390, height: 844, scale: 2, fontScale: 1 });

// PixelRatio.
export const PixelRatio = {
  get: () => 2,
  getFontScale: () => 1,
  getPixelSizeForLayoutSize: (n: number) => n * 2,
  roundToNearestPixel: (n: number) => Math.round(n),
};

// Animated — minimal stub; tests don't exercise animations.
export const Animated = {
  View: stub('Animated.View'),
  Text: stub('Animated.Text'),
  ScrollView: stub('Animated.ScrollView'),
  Image: stub('Animated.Image'),
  Value: class { constructor(public _v: number) {} setValue(v: number) { this._v = v; } },
  timing: () => ({ start: (cb?: () => void) => cb && cb() }),
  spring: () => ({ start: (cb?: () => void) => cb && cb() }),
  parallel: () => ({ start: (cb?: () => void) => cb && cb() }),
  sequence: () => ({ start: (cb?: () => void) => cb && cb() }),
  createAnimatedComponent: <T,>(c: T) => c,
};

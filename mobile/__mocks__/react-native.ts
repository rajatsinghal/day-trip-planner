// Minimal mock for react-native to satisfy imports in Jest.
// Only exports what the store/selectors/tests actually touch.
export const Platform = { OS: 'ios', select: (obj: Record<string, unknown>) => obj.ios ?? obj.default };
export const NativeModules = {};

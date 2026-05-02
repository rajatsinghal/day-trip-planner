// Manual mock for react-native-mmkv in Jest.
// Uses a plain Map so tests run without native bindings.

export class MMKV {
  private store = new Map<string, string>();

  constructor(_opts?: { id?: string }) {}

  getString(key: string): string | undefined {
    return this.store.get(key);
  }

  set(key: string, value: string): void {
    this.store.set(key, value);
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  contains(key: string): boolean {
    return this.store.has(key);
  }
}

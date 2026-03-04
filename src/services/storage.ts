// Lightweight wrapper to avoid TypeScript/ESM interop issues with AsyncStorage
export async function getStoredItem(key: string): Promise<string | null> {
  const mod = await import('@react-native-async-storage/async-storage');
  const AsyncStorage = (mod as any).default || mod;
  return AsyncStorage.getItem(key);
}

export async function setStoredItem(key: string, value: string): Promise<void> {
  const mod = await import('@react-native-async-storage/async-storage');
  const AsyncStorage = (mod as any).default || mod;
  return AsyncStorage.setItem(key, value);
}

export async function removeStoredItem(key: string): Promise<void> {
  const mod = await import('@react-native-async-storage/async-storage');
  const AsyncStorage = (mod as any).default || mod;
  return AsyncStorage.removeItem(key);
}
export async function clearStoredData(): Promise<void> {
  const mod = await import('@react-native-async-storage/async-storage');
  const AsyncStorage = (mod as any).default || mod;
  return AsyncStorage.clear();
}

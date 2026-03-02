import { Platform } from 'react-native';

export function currentHost() {
  return Platform.OS === 'android' ? '10.0.2.2' : '127.0.0.1';
}

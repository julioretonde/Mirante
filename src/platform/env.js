import { Capacitor } from '@capacitor/core';

/** 'android' | 'ios' | 'web' */
export const platformName = safe(() => Capacitor.getPlatform(), 'web');
export const isNative = safe(() => Capacitor.isNativePlatform(), false);

export function isPluginAvailable(name) {
  return isNative && safe(() => Capacitor.isPluginAvailable(name), false);
}

function safe(fn, fallback) {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

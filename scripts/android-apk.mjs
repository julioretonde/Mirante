/**
 * Compila o APK de debug sem abrir o Android Studio (útil para checar erros de build).
 * Uso: npm run android:apk  →  android/app/build/outputs/apk/debug/app-debug.apk
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const win = process.platform === 'win32';
const gradlew = win ? 'gradlew.bat' : './gradlew';
const result = spawnSync(gradlew, ['assembleDebug', '--console=plain'], {
  cwd: path.resolve('android'),
  stdio: 'inherit',
  shell: win,
});
process.exit(result.status ?? 1);

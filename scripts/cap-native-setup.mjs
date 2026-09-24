#!/usr/bin/env node
// =============================================================================
//  Ajustes automáticos nos projetos nativos do Capacitor (se existirem):
//   - Android: trava a Activity principal em retrato e declara a vibração.
//   - iOS: deixa só a orientação retrato no Info.plist.
//  É executado pelos scripts android:* / ios:* / cap:sync do package.json.
// =============================================================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const done = [];

// ------------------------------------------------------------------ Android --
const manifest = path.join(root, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
if (fs.existsSync(manifest)) {
  let xml = fs.readFileSync(manifest, 'utf8');
  const before = xml;
  if (!/screenOrientation=/.test(xml)) {
    xml = xml.replace(/<activity(\s)/, '<activity android:screenOrientation="portrait"$1');
  }
  if (!/android\.permission\.VIBRATE/.test(xml)) {
    xml = xml.replace(/(<manifest[^>]*>)/, '$1\n    <uses-permission android:name="android.permission.VIBRATE" />');
  }
  if (xml !== before) {
    fs.writeFileSync(manifest, xml);
    done.push('Android: retrato + vibração');
  }
}

// ---------------------------------------------------------------------- iOS --
const plist = path.join(root, 'ios', 'App', 'App', 'Info.plist');
if (fs.existsSync(plist)) {
  let xml = fs.readFileSync(plist, 'utf8');
  const before = xml;
  const portrait = '<array>\n\t\t<string>UIInterfaceOrientationPortrait</string>\n\t</array>';
  xml = xml.replace(/(<key>UISupportedInterfaceOrientations(?:~ipad)?<\/key>\s*)<array>[\s\S]*?<\/array>/g, `$1${portrait}`);
  if (xml !== before) {
    fs.writeFileSync(plist, xml);
    done.push('iOS: somente retrato');
  }
}

if (done.length) console.log('Ajustes nativos aplicados: ' + done.join('; '));

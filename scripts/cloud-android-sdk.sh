#!/usr/bin/env bash
# Só para o ambiente de desenvolvimento na nuvem (Linux): instala o Android SDK mínimo
# para compilar o APK. No Windows, o Android Studio já instala tudo.
set -euo pipefail
SDK="${ANDROID_HOME:-$HOME/android-sdk}"
CLT="commandlinetools-linux-16111833_latest.zip"

if [ ! -x "$SDK/cmdline-tools/latest/bin/sdkmanager" ]; then
  mkdir -p "$SDK/cmdline-tools"
  tmp="$(mktemp -d)"
  curl -sSLo "$tmp/clt.zip" "https://dl.google.com/android/repository/$CLT"
  unzip -q "$tmp/clt.zip" -d "$tmp"
  mv "$tmp/cmdline-tools" "$SDK/cmdline-tools/latest"
  rm -rf "$tmp"
fi
yes | "$SDK/cmdline-tools/latest/bin/sdkmanager" --licenses > /dev/null 2>&1 || true
"$SDK/cmdline-tools/latest/bin/sdkmanager" "platform-tools" "platforms;android-36" "build-tools;36.0.0" > /dev/null

# Maven Central costuma responder 429 para o IP do proxy; usa o espelho oficial do Google.
mkdir -p "$HOME/.gradle/init.d"
cat > "$HOME/.gradle/init.d/maven-mirror.gradle" <<'GRADLE'
def mirror = 'https://maven-central.storage-download.googleapis.com/maven2/'
beforeSettings { settings ->
    settings.pluginManagement.repositories { maven { url mirror } }
}
allprojects {
    buildscript.repositories.all { repo ->
        if (repo instanceof MavenArtifactRepository && repo.url.toString().contains('repo.maven.apache.org')) repo.url = mirror
    }
    repositories.all { repo ->
        if (repo instanceof MavenArtifactRepository && repo.url.toString().contains('repo.maven.apache.org')) repo.url = mirror
    }
}
GRADLE

echo "sdk.dir=$SDK" > android/local.properties
echo "Android SDK pronto em $SDK"

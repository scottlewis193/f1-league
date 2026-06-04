# F1 League Android APK (Trusted Web Activity)

This project can package the hosted PWA as an Android Trusted Web Activity using Google's Bubblewrap CLI.

## Committed project support

- `scripts/build-twa.mjs` wraps prerequisite checks, the normal SvelteKit build, and Bubblewrap commands.
- `twa-manifest.example.json` documents the app metadata shape.
- `package.json` exposes `npm run twa:doctor`, `npm run twa:init`, and `npm run twa:build`.

## Local-only files

Do not commit signing keys, generated Android packages, SDK downloads, or the generated `twa-manifest.json` if it includes local signing paths.

Recommended local signing-key location:

```sh
mkdir -p ~/.bubblewrap
# Bubblewrap/keytool can create the release key under ~/.bubblewrap/f1-league-release.jks
```

## Prerequisites

Install these on the machine that builds the APK:

- Node/npm (already used by this app)
- JDK 17+ (`java` and `keytool` must be on `PATH`)
- Android SDK/ADB for installing the result on a device
- Network access for `npm exec --package @bubblewrap/cli`

Check the Java/Bubblewrap prerequisites with:

```sh
npm run twa:doctor
```

If Java is missing on CachyOS/Arch:

```sh
sudo pacman -S jdk17-openjdk
```

## Initialise Bubblewrap once

Bubblewrap validates a hosted PWA manifest. Deploy or expose the app over HTTPS first, then run:

```sh
npm run twa:init -- --manifest https://your-domain.example/manifest.webmanifest
```

For the current public deployment this is likely:

```sh
npm run twa:init -- --manifest https://f1-league.hades.ws/manifest.webmanifest
```

This creates the local `twa-manifest.json`. Keep any real signing-key paths and passwords out of git.

## Build the APK

```sh
npm run twa:build
```

The script runs `npm run build` first so the normal SvelteKit build remains part of the APK path, then runs Bubblewrap. If the JDK, keytool, Bubblewrap, or local `twa-manifest.json` is missing, the script exits with a specific next step instead of failing deep inside the Android build.

## Digital Asset Links

A production TWA also needs `/.well-known/assetlinks.json` on the hosted domain linking the Android package name to the release certificate fingerprint. Generate the statement after the release key exists and the final package id is confirmed.

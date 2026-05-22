# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing any code.

## Cursor Cloud specific instructions

This is a pure client-side Expo SDK 54 / React Native app with no backend or external services. All data is local/dummy.

### Running the app

- **Dev server (web):** `npx expo start --web --port 8081` from the `BoneyAI/` directory. The app renders at http://localhost:8081.
- **Type checking:** `npm run typecheck` (runs `tsc --noEmit`).
- There is no lint command beyond `typecheck`, and no test framework is configured.

### Key notes

- The lockfile is `package-lock.json` — use `npm` (not pnpm/yarn).
- No `.env` or secrets are required; the app uses hardcoded dummy data and AsyncStorage.
- Web is the simplest platform to test on in Cloud Agent VMs (no native emulators needed).

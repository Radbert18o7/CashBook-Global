# Cashbook Global

Cross-platform cashbook app built with [Expo](https://expo.dev) (React Native) and [Expo Router](https://docs.expo.dev/router/introduction/). Targets Android, iOS, and static web export.

## Stack

- **UI:** React 19, NativeWind / Tailwind, Reanimated, gesture handler  
- **Data:** Firebase (client SDK; native uses `@react-native-firebase`), Cloud Functions in `functions/`  
- **i18n:** i18next; locale files under `i18n/locales/` (run `npm run i18n:build` after structural changes)  
- **State:** Zustand (`store/`)

## Prerequisites

- Node.js LTS and npm  
- For Android/iOS native builds: follow [Expo development builds](https://docs.expo.dev/develop/development-builds/introduction/)  
- Firebase and other secrets: copy `.env` from your team (see `app.json` / Expo env usage)

## Scripts

| Command | Purpose |
|--------|---------|
| `npm install` | Install dependencies |
| `npx expo start` | Dev server (same as `npm run start`) |
| `npm run android` / `npm run ios` | Run native projects |
| `npm run web` | Web dev |
| `npm run export:web` | Static web export |
| `npm run lint` | ESLint |
| `npm test` | Jest (`__tests__/`) |
| `npm run i18n:build` | Regenerate flat locale JSON |
| `npm run deploy:firestore-rules` | Deploy Firestore rules (`firebase.json`) |

## Project layout

- `app/` — file-based routes (`(auth)`, `(app)`, home, reports, settings)  
- `components/` — shared UI  
- `services/` — Firebase and integrations  
- `functions/` — Firebase Cloud Functions (TypeScript)

## Fresh Expo scaffold

To reset the starter layout (moves current `app` to `app-example`), use:

```bash
npm run reset-project
```

---

Engineering delivery for this repo is owned by the **Founding Engineer** agent in Paperclip. For a separate **human** contractor or hiring approval, add a comment on the tracking issue so PM can open the right path.

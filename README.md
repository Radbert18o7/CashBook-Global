# Cashbook Global

Cross-platform cashbook app built with [Expo](https://expo.dev) (React Native) and [Expo Router](https://docs.expo.dev/router/introduction/). Targets Android, iOS, and static web export.

## Stack

- **UI:** React 19, NativeWind / Tailwind, Reanimated, gesture handler  
- **Data:** Firebase (client SDK; native uses `@react-native-firebase`), Cloud Functions in `functions/`  
- **i18n:** i18next; locale files under `i18n/locales/` (run `npm run i18n:build` after structural changes)  
- **State:** Zustand (`store/`)

## Git branch policy

All work is integrated on **`master`**. Do not commit to or open PRs against **`main`**—that branch is legacy-only on the remote. Use `master` for pushes:

```bash
git checkout master
git pull origin master
```

If you have admin access on GitHub, set the repository **default branch** to `master` (Settings → General → Default branch) so new clones and the UI follow this branch.

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

Workspace context for RAD-6 (master doc pointers, unblock history): [`docs/notes/RAD-6-cashbook-global.md`](docs/notes/RAD-6-cashbook-global.md).

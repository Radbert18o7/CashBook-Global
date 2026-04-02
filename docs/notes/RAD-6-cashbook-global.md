# RAD-6 — Cashbook Global workspace (engineering)

## Status

The **project primary workspace** for Cashbook Global is this repository: Expo Router app (`app/`), Firebase client services (`services/`), Cloud Functions (`functions/`), Firestore rules (`firestore.rules`).

The master BRD / UAT / RTM content lives in Paperclip as embedded issue descriptions on **RAD-11** and **RAD-15** (not as a file attachment in this repo).

## Prior blockers (cleared)

Earlier heartbeats could not ship app fixes because the legacy tree was not mounted here. Per PM unblock on RAD-6 (2026-04-02), the board confirmed:

- Remote: `https://github.com/Radbert18o7/CashBook-Global`
- Local cwd aligns with the workspace machine path for this clone.

## Suggested next engineering passes

Use the “Known Issues” table in the master doc (section 9) as the backlog: Firestore rules deploy, `sanitizeFirestoreData` on writes, safe areas, auth routing, tab bar visibility, pagination empty states, and modular Firebase APIs where warnings remain.

## Verification

- `npm test`
- `npx tsc --noEmit`

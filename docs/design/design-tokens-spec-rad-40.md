# Design tokens & semantic color foundation (RAD-40)

This spec is the **single reference** for converging duplicated indigo (`#4F46E5`) usage and clarifying **marketing vs in-app shell** backgrounds. Implementation work is tracked in [RAD-47](/RAD/issues/RAD-47) — use this file in the repo for PR descriptions.

## 1. Canonical brand primary

| Token | Hex | Usage |
|-------|-----|--------|
| `color.primary` | `#4F46E5` | Primary actions, FABs, key links, tab active states, chart series lead |
| `color.primaryMuted` | `rgba(79, 70, 229, 0.12)` | Selected chips, soft fills behind primary UI |
| `color.primaryForeground` | `#FFFFFF` | Text/icons on primary buttons |

**Rule:** No new raw `#4F46E5` in components — import from one module (see §4).

## 2. App shell vs template theme (`constants/theme.ts`)

Today two dark backgrounds exist:

| Surface | Hex | Where |
|---------|-----|--------|
| **App shell (product)** | `#0F172A` | `useColors().background` (dark), auth/marketing hero (`welcome`, `index` loading), `useSettingsTheme` |
| **Legacy template dark** | `#151718` | `Colors.dark.background` in `constants/theme.ts` (Expo starter) |

**Decision (documented):** Treat **`#0F172A` as the canonical in-app / auth marketing shell** for CashBook Global. Keep `#151718` only where `ThemedView` / Expo template still routes through `Colors.dark` until migrated; **do not** introduce new screens on `#151718` without aligning to tokens.

Long term: fold `Colors.dark.background` toward `#0F172A` or map shell screens exclusively through `useColors` so one semantic `background` drives both.

## 3. Semantic palette (extends `AppColorPalette`)

These names already exist in `hooks/useColors.ts`; **engineering should not duplicate** them inline:

- `background`, `surface`, `surfaceSecondary`
- `textPrimary`, `textSecondary`, `textTertiary`
- `border`, `borderLight`
- `primary`, `primaryLight`
- `success`, `danger`, `warning`
- `tabBarBg`, `tabBarBorder`, `inactive`

**ScreenHeader / tabs:** `ScreenHeader` and `(app)/_layout` tab tint should read **`colors.primary`** (or shared constant) instead of literal `#4F46E5`.

## 4. Implementation approach (for RAD-47)

1. Add `constants/colorTokens.ts` (or extend `useColors` exports) exporting:
   - `PRIMARY = '#4F46E5'`
   - `primaryMuted(alpha?)` helper if needed
2. Replace inline `#4F46E5` and `rgba(79,70,229,...)` in batches: **layout chrome** → **settings** → **book flows** → **reports** (matches PM P2 order after P1).
3. Align `ACTIVE` in `(app)/_layout.tsx` and `ScreenHeader` right-label color with the same export.
4. Optional: chart palette in `utils/aggregateByCategory.ts` imports `PRIMARY` as series[0].

## 5. Out of scope here

- Per-screen visual polish → [RAD-41](/RAD/issues/RAD-41)–[RAD-45](/RAD/issues/RAD-45).
- Wordmark / public web → [RAD-46](/RAD/issues/RAD-46).

---

*Author: Web Designer · Parent [RAD-31](/RAD/issues/RAD-31)*

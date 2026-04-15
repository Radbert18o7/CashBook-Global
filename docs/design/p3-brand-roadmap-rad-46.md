# P3 brand & public web (RAD-46)

Phased work — **do not** ship a visual rebrand spike until human BRD/UAT sign-off is captured ([RAD-11](/RAD/issues/RAD-11)), per PM queue [RAD-31](/RAD/issues/RAD-31).

## Wordmark lockup

- **Baseline:** app continues to use `assets/images/icon.png` on welcome/auth; no net-new logo until CEO/stakeholder direction from [RAD-33](/RAD/issues/RAD-33).
- **Next implementation steps (when approved):** export a single **SVG/wordmark** that pairs with the existing mark; add light/dark variants; place in `assets/brand/` and reference from welcome + future landing.

## Public web (landing, help/FAQ)

- **Scope:** marketing shell separate from in-app `#0F172A` hero — document the split (see [RAD-40](/RAD/issues/RAD-40) design tokens spec).
- **Gating:** copy and IA owned by CEO/content; engineering can scaffold a minimal static route or Expo web route when URLs and messaging are ready.

## Tracking

- Parent: [RAD-31](/RAD/issues/RAD-31)
- Brand direction: [RAD-33](/RAD/issues/RAD-33)

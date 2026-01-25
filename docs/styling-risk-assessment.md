# Styling Risk Assessment: Tailwind + PrimeVue with Bootstrap

## Known or Expected Conflicts
- Tailwind preflight can reset margins, fonts, and form controls that Bootstrap styles expect.
- PrimeVue theme/base styles can target generic elements (buttons, inputs) and drift from Bootstrap defaults if not isolated.
- Utility classes can accidentally leak onto non-PrimeVue markup and override Bootstrap spacing or typography.
- Component class name collisions are unlikely (PrimeVue uses prefixed classes), but selector specificity can still override Bootstrap.

## Mitigations in This Codebase
- Tailwind preflight is disabled to avoid global resets.
- Tailwind utilities are prefixed with `tw-` to reduce class collisions.
- Tailwind styles are scoped to the `.cc-tailwind` container using `important`, preventing cascade outside intended areas.
- PrimeVue is configured as `unstyled` so component look comes from Tailwind utilities and pass-through styles, not global CSS.

## Go / No-Go
- Go, with the current isolation setup. The remaining risk is accidental use of unscoped Tailwind utilities or adding global PrimeVue theme CSS later.
- If global PrimeVue themes or Tailwind preflight are enabled, re-run a visual audit on Bootstrap-heavy screens before release.

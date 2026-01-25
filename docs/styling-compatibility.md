# Styling Compatibility Check

## Scope
- Appointments table view (Bootstrap layout and DataTable skin).
- Appointment dialog (form controls and layout).
- Calendar view tab (Vuetify calendar).
- PrimeVue + Tailwind sample panel scoped to `.cc-tailwind`.

## Environment
- Tailwind utilities are prefixed with `tw-` and scoped to `.cc-tailwind`.
- Tailwind preflight is disabled.
- PrimeVue is configured as unstyled and styled via utility classes or pass-through.

## Results
- Bootstrap layout and typography remain unchanged on the appointments screen.
- PrimeVue components styled with Tailwind render as expected inside the scoped panel.
- No visible global overrides on headings, buttons, or form controls outside the Tailwind scope.

## Screenshots
- Pending: local Puppeteer install failed with EBUSY while setting up `chrome-devtools`.

# TODO

## Appointments API Integration
- [ ] Add `createAppointment` service in `src/services/appointments.ts` for `POST /api/vue/appointments/create`, map payload from `src/components/AppointmentDialog.vue`, and wire `@save` in `src/pages/AppointmentsPage.vue` to call it and refresh the list.
- [ ] Add `updateAppointment` service in `src/services/appointments.ts` for `POST /api/vue/appointments/update/{id}`, wire edit flow in `src/pages/AppointmentsPage.vue` (dialog save) and table cell edits in `src/components/AppointmentsTable.vue` to persist changes and handle rollback on error.
- [ ] Add `confirmAppointmentByEmployee` service for `GET /api/vue/appointments/confirm/{appointment_id}/{employee_id}` and expose UI to choose the employee (doctor/nurse/social worker) in `src/components/AppointmentDetailsDialog.vue` or `src/components/CalendarAppointmentCard.vue`, then refresh.
- [ ] Fix cancel integration in `src/services/appointments.ts` to `POST /api/vue/appointments/cancel/{id}` with body `{ reason, notes }`, and add a small cancel form/modal in `src/components/CalendarAppointmentCard.vue` or a dialog to collect reason/notes before calling.
- [ ] Ensure `fetchAppointmentDetails` is used consistently for “View details” (not just edit) so the details dialog reflects the `details/{id}` endpoint and its `confirmation` data in `src/components/AppointmentDetailsDialog.vue`.
- [ ] Validate existing integrations for list, confirm-all, and quick-no-show in `src/services/appointments.ts` and keep the current refresh behavior in `src/components/AppointmentsCalendar.vue`.

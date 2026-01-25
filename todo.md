# TODO

- [x] Fix patient selection gating: `AutoComplete` can set the model to a raw input string while typing; only enable address fields when a real patient option is selected (e.g., object with `id`).
- [x] Persist DataTable cell edits: add a `cell-edit-complete` handler to commit `event.newValue`/`event.newData` to `appointments` so inline edits are not discarded.
- [x] Persist cell edits to appointments data in `AppointmentsTable.vue`: handle `cell-edit-complete` and update the backing appointments list (or emit and update in parent) so inline edits are retained.
- [x] Persist appointment instructions from `AppointmentDialog.vue` textarea in the save payload (and update `NewAppointment` type).
- [ ] Persist nurse start/end times from `AppointmentDialog.vue` nurse time pickers in the save payload (and update `NewAppointment` type).
- [ ] Persist social worker selection from `AppointmentDialog.vue` in the save payload (and update `NewAppointment` type).


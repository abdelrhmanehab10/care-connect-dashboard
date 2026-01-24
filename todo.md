# TODO

- [x] Fix patient selection gating: `AutoComplete` can set the model to a raw input string while typing; only enable address fields when a real patient option is selected (e.g., object with `id`).
- [x] Persist DataTable cell edits: add a `cell-edit-complete` handler to commit `event.newValue`/`event.newData` to `appointments` so inline edits are not discarded.


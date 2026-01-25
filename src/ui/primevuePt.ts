export const dialogPt = {
  mask: { class: "cc-dialog-mask" },
  root: { class: "cc-dialog" },
  header: { class: "cc-dialog-header" },
  content: { class: "cc-dialog-content" },
  footer: { class: "cc-dialog-footer" },
} as const;

export const autoCompletePt = {
  root: { class: "w-100 position-relative" },
  pcInputText: { root: { class: "form-control" } },
  listContainer: { class: "cc-autocomplete-list" },
  list: { class: "list-group list-group-flush" },
  option: { class: "list-group-item list-group-item-action" },
  emptyMessage: { class: "list-group-item text-muted small" },
} as const;

export const datePickerPt = {
  root: { class: "w-100 position-relative" },
  pcInputText: { root: { class: "form-control" } },
  panel: { class: "cc-datepicker-panel" },
  header: { class: "cc-datepicker-header" },
  title: { class: "cc-datepicker-title" },
  selectMonth: { class: "btn btn-link p-0 cc-datepicker-title-btn" },
  selectYear: { class: "btn btn-link p-0 cc-datepicker-title-btn" },
  pcPrevButton: {
    root: { class: "btn btn-outline-secondary btn-sm cc-datepicker-nav" },
    icon: { class: "cc-datepicker-nav-icon" },
  },
  pcNextButton: {
    root: { class: "btn btn-outline-secondary btn-sm cc-datepicker-nav" },
    icon: { class: "cc-datepicker-nav-icon" },
  },
  dayView: { class: "cc-datepicker-table" },
  tableHeader: { class: "cc-datepicker-table" },
  tableHeaderRow: { class: "cc-datepicker-header-row" },
  tableHeaderCell: { class: "cc-datepicker-th" },
  weekDay: { class: "cc-datepicker-weekday" },
  tableBody: { class: "cc-datepicker-body" },
  tableBodyRow: { class: "cc-datepicker-row" },
  dayCell: ({ context }: { context?: { otherMonth?: boolean } }) => ({
    class: [
      "cc-datepicker-day-cell",
      context?.otherMonth ? "cc-datepicker-day-other" : "",
    ],
  }),
  day: ({
    context,
  }: {
    context?: { selected?: boolean; today?: boolean; disabled?: boolean };
  }) => ({
    class: [
      "cc-datepicker-day",
      context?.selected ? "cc-datepicker-day-selected" : "",
      context?.today ? "cc-datepicker-day-today" : "",
      context?.disabled ? "cc-datepicker-day-disabled" : "",
    ],
  }),
  timePicker: { class: "cc-time-picker" },
  hourPicker: { class: "cc-time-col" },
  minutePicker: { class: "cc-time-col" },
  separatorContainer: { class: "cc-time-sep" },
  separator: { class: "cc-time-sep-text" },
  hour: { class: "cc-time-value" },
  minute: { class: "cc-time-value" },
  pcIncrementButton: {
    root: { class: "btn btn-outline-secondary btn-sm cc-time-btn" },
    icon: { class: "cc-time-btn-icon" },
  },
  pcDecrementButton: {
    root: { class: "btn btn-outline-secondary btn-sm cc-time-btn" },
    icon: { class: "cc-time-btn-icon" },
  },
} as const;

export const toggleSwitchPt = {
  root: { class: "cc-toggle" },
  input: { class: "cc-toggle-input" },
  slider: { class: "cc-toggle-slider" },
  handle: { class: "cc-toggle-handle" },
} as const;

export const dataTablePt = {
  root: { class: "cc-datatable" },
  tableContainer: { class: "table-responsive" },
  table: { class: "table table-hover align-middle mb-0" },
  thead: { class: "table-light" },
  tbody: { class: "table-group-divider" },
} as const;

export const tabViewPt = {
  root: { class: "cc-tabview" },
  navContainer: { class: "cc-tabview-nav-container" },
  nav: { class: "nav nav-tabs" },
  inkbar: { class: "d-none" },
  tabpanel: {
    header: { class: "nav-item" },
    headerAction: ({ context }: { context?: { active?: boolean } }) => ({
      class: ["nav-link", context?.active ? "active" : ""],
    }),
    content: { class: "pt-3" },
  },
} as const;

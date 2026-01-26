export const dialogPt = {
  mask: { class: "cc-dialog-mask" },
  root: { class: "cc-dialog" },
  header: { class: "cc-dialog-header" },
  content: { class: "cc-dialog-content" },
  footer: { class: "cc-dialog-footer" },
} as const;

export const autoCompletePt = {
  root: { class: "cc-input-wrap" },
  pcInputText: { root: { class: "cc-input" } },
  listContainer: { class: "cc-autocomplete-list" },
  list: { class: "cc-list" },
  option: { class: "cc-list-item cc-list-item-action" },
  emptyMessage: { class: "cc-list-item cc-list-item-muted" },
} as const;

export const datePickerPt = {
  root: { class: "cc-input-wrap" },
  pcInputText: { root: { class: "cc-input" } },
  panel: { class: "cc-datepicker-panel" },
  header: { class: "cc-datepicker-header" },
  title: { class: "cc-datepicker-title" },
  selectMonth: { class: "cc-link-btn cc-datepicker-title-btn" },
  selectYear: { class: "cc-link-btn cc-datepicker-title-btn" },
  pcPrevButton: {
    root: { class: "cc-icon-btn cc-icon-btn-outline cc-datepicker-nav" },
    icon: { class: "cc-datepicker-nav-icon" },
  },
  pcNextButton: {
    root: { class: "cc-icon-btn cc-icon-btn-outline cc-datepicker-nav" },
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
    root: { class: "cc-icon-btn cc-icon-btn-outline cc-time-btn" },
    icon: { class: "cc-time-btn-icon" },
  },
  pcDecrementButton: {
    root: { class: "cc-icon-btn cc-icon-btn-outline cc-time-btn" },
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
  tableContainer: { class: "cc-table-wrap" },
  table: { class: "cc-table" },
  thead: { class: "cc-table-head" },
  tbody: { class: "cc-table-body" },
} as const;

export const tabViewPt = {
  root: { class: "cc-tabview" },
  navContainer: { class: "cc-tabs-wrap" },
  nav: { class: "cc-tabs" },
  inkbar: { class: "cc-tab-inkbar" },
  tabpanel: {
    header: { class: "cc-tab" },
    headerAction: ({ context }: { context?: { active?: boolean } }) => ({
      class: ["cc-tab-link", context?.active ? "is-active" : ""],
    }),
    content: { class: "cc-tab-content" },
  },
} as const;

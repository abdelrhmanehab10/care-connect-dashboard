import { mount } from "@vue/test-utils";
import { createPinia } from "pinia";
import { defineComponent, h, inject, provide } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Appointment } from "../../src/types";
import type { AppointmentStatusOption } from "../../src/services/appointments";

const mockState = vi.hoisted(() => ({
  appointments: [] as Appointment[],
  isLoading: false,
  statusOptions: [] as AppointmentStatusOption[],
  refetch: vi.fn(() => Promise.resolve()),
  fetchDetails: vi.fn(async () => ({})),
  updateAppointment: vi.fn(async () => ({})),
}));

vi.mock("../../src/composables/useAppointmentsQuery", () => ({
  statusBadgeClass: () => "",
  useAppointmentsQuery: () => ({
    appointments: { value: mockState.appointments },
    data: {
      value: {
        total: mockState.appointments.length,
        perPage: 10,
        currentPage: 1,
        hasMorePages: false,
      },
    },
    isLoading: { value: mockState.isLoading },
    statusOptions: mockState.statusOptions,
    refetch: mockState.refetch,
  }),
}));

vi.mock("../../src/services/visitTypes", () => ({
  fetchVisitTypes: vi.fn(async () => []),
}));

vi.mock("../../src/services/appointments", () => ({
  fetchAppointmentDetails: (...args: unknown[]) => mockState.fetchDetails(...args),
  updateAppointment: (...args: unknown[]) => mockState.updateAppointment(...args),
}));

import AppointmentsTable from "../../src/components/AppointmentsTable.vue";

const DataTableStub = defineComponent({
  name: "DataTable",
  props: {
    value: {
      type: Array,
      default: () => [],
    },
  },
  emits: ["cell-edit-init", "cell-edit-complete", "cell-edit-cancel"],
  setup(props, { slots }) {
    provide("table-rows", props.value);
    return () => h("div", slots.default ? slots.default() : []);
  },
});

const ColumnStub = defineComponent({
  name: "Column",
  props: {
    field: {
      type: String,
      default: "",
    },
  },
  setup(props, { slots }) {
    const rows = inject<Appointment[]>("table-rows", []);
    const data = rows[0];
    if (!data || props.field !== "status") {
      return () => null;
    }

    return () =>
      h("div", { "data-field": props.field }, [
        slots.editor
          ? slots.editor({
              data,
              editorSaveCallback: () => {},
              editorCancelCallback: () => {},
            })
          : null,
      ]);
  },
});

const statusOptions: AppointmentStatusOption[] = [
  { key: "new", value: "New", level: 1, is_final: false },
  { key: "waiting", value: "Waiting", level: 1, is_final: false },
  { key: "confirmed", value: "Confirmed", level: 2, is_final: false },
  {
    key: "patient_confirmed",
    value: "Patient Confirmed",
    level: 2,
    is_final: false,
  },
  { key: "rescheduled", value: "Rescheduled", level: 2, is_final: false },
  { key: "canceled", value: "Canceled", level: 3, is_final: true },
  { key: "completed", value: "Completed", level: 3, is_final: true },
  { key: "no_show", value: "No Show", level: 3, is_final: true },
];

const makeAppointment = (status: string): Appointment => ({
  id: 101,
  patient: {
    id: 1,
    name: "Test Patient",
    date_of_birth: "1992-01-01",
    phone: "01000000000",
  },
  start_time: "02:02:00",
  end_time: "04:02:00",
  date: "2026/02/14",
  status,
  nurse: { id: 1, name: "Nurse A" },
  doctor: { id: 2, name: "Doctor B" },
  visit_type: "Initial Visit",
  state: status,
});

const mountTable = (
  appointment: Appointment,
  options: AppointmentStatusOption[] = statusOptions,
) => {
  mockState.appointments = [appointment];
  mockState.isLoading = false;
  mockState.statusOptions = options;

  return mount(AppointmentsTable, {
    global: {
      plugins: [createPinia()],
      stubs: {
        DataTable: DataTableStub,
        Column: ColumnStub,
        AutoComplete: true,
      },
    },
  });
};

beforeEach(() => {
  mockState.refetch.mockClear();
  mockState.fetchDetails.mockClear();
  mockState.updateAppointment.mockClear();
});

describe("AppointmentsTable status rules", () => {
  it("disables status editing for final statuses", () => {
    const wrapper = mountTable(makeAppointment("completed"));
    const select = wrapper.find("select");
    expect(select.exists()).toBe(true);
    expect((select.element as HTMLSelectElement).disabled).toBe(true);
  });

  it("blocks editing status field when status is final", () => {
    const appointment = makeAppointment("canceled");
    const wrapper = mountTable(appointment);
    const table = wrapper.findComponent(DataTableStub);
    const preventDefault = vi.fn();
    const stopPropagation = vi.fn();
    const stopImmediatePropagation = vi.fn();

    table.vm.$emit("cell-edit-init", {
      originalEvent: {
        preventDefault,
        stopPropagation,
        stopImmediatePropagation,
      },
      data: appointment,
      field: "status",
      index: 0,
    });

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(stopPropagation).toHaveBeenCalledTimes(1);
    expect(stopImmediatePropagation).toHaveBeenCalledTimes(1);
  });

  it("blocks non-status fields when status is final", () => {
    const appointment = makeAppointment("canceled");
    const wrapper = mountTable(appointment);
    const table = wrapper.findComponent(DataTableStub);
    const preventDefault = vi.fn();
    const stopPropagation = vi.fn();
    const stopImmediatePropagation = vi.fn();

    table.vm.$emit("cell-edit-init", {
      originalEvent: {
        preventDefault,
        stopPropagation,
        stopImmediatePropagation,
      },
      data: appointment,
      field: "date",
      index: 0,
    });

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(stopPropagation).toHaveBeenCalledTimes(1);
    expect(stopImmediatePropagation).toHaveBeenCalledTimes(1);
  });

  it("blocks doctor and time edits when status is finalStatus", () => {
    const appointment = makeAppointment("finalStatus");
    const wrapper = mountTable(appointment);
    const table = wrapper.findComponent(DataTableStub);

    const preventDefaultDoctor = vi.fn();
    const stopPropagationDoctor = vi.fn();
    const stopImmediatePropagationDoctor = vi.fn();
    table.vm.$emit("cell-edit-init", {
      originalEvent: {
        preventDefault: preventDefaultDoctor,
        stopPropagation: stopPropagationDoctor,
        stopImmediatePropagation: stopImmediatePropagationDoctor,
      },
      data: appointment,
      field: "doctor",
      index: 0,
    });

    const preventDefaultTime = vi.fn();
    const stopPropagationTime = vi.fn();
    const stopImmediatePropagationTime = vi.fn();
    table.vm.$emit("cell-edit-init", {
      originalEvent: {
        preventDefault: preventDefaultTime,
        stopPropagation: stopPropagationTime,
        stopImmediatePropagation: stopImmediatePropagationTime,
      },
      data: appointment,
      field: "start_time",
      index: 0,
    });

    expect(preventDefaultDoctor).toHaveBeenCalledTimes(1);
    expect(stopPropagationDoctor).toHaveBeenCalledTimes(1);
    expect(stopImmediatePropagationDoctor).toHaveBeenCalledTimes(1);
    expect(preventDefaultTime).toHaveBeenCalledTimes(1);
    expect(stopPropagationTime).toHaveBeenCalledTimes(1);
    expect(stopImmediatePropagationTime).toHaveBeenCalledTimes(1);
  });

  it("limits level-2 statuses to final options", () => {
    const wrapper = mountTable(makeAppointment("confirmed"));
    const options = wrapper.findAll("select option");
    const enabledValues = options
      .filter((option) => !(option.element as HTMLOptionElement).disabled)
      .map((option) => (option.element as HTMLOptionElement).value);

    expect(enabledValues).toEqual(["canceled", "completed", "no_show"]);

    const confirmedOption = options.find(
      (option) => (option.element as HTMLOptionElement).value === "confirmed",
    );
    expect(confirmedOption?.element).toBeTruthy();
    expect((confirmedOption?.element as HTMLOptionElement).disabled).toBe(
      true,
    );
  });

  it("reverts invalid status transitions on save", async () => {
    const appointment = makeAppointment("confirmed");
    const wrapper = mountTable(appointment);
    const table = wrapper.findComponent(DataTableStub);

    table.vm.$emit("cell-edit-init", {
      originalEvent: new Event("click"),
      data: appointment,
      field: "status",
      index: 0,
    });

    appointment.status = "new";
    table.vm.$emit("cell-edit-complete", {
      originalEvent: new Event("keydown"),
      data: appointment,
      newData: appointment,
      value: "confirmed",
      newValue: "new",
      field: "status",
      index: 0,
    });

    expect(appointment.status).toBe("confirmed");
  });

  it("treats completed as final even when API status options are misconfigured", () => {
    const misconfiguredOptions: AppointmentStatusOption[] = [
      { key: "completed", value: "Completed", level: 1, is_final: false },
      { key: "new", value: "New", level: 1, is_final: false },
    ];
    const appointment = makeAppointment("completed");
    const wrapper = mountTable(appointment, misconfiguredOptions);
    const table = wrapper.findComponent(DataTableStub);
    const preventDefault = vi.fn();
    const stopPropagation = vi.fn();
    const stopImmediatePropagation = vi.fn();

    table.vm.$emit("cell-edit-init", {
      originalEvent: {
        preventDefault,
        stopPropagation,
        stopImmediatePropagation,
      },
      data: appointment,
      field: "start_time",
      index: 0,
    });

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(stopPropagation).toHaveBeenCalledTimes(1);
    expect(stopImmediatePropagation).toHaveBeenCalledTimes(1);
  });
});

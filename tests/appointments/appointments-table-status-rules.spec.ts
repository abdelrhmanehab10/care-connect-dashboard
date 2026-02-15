import { mount } from "@vue/test-utils";
import { defineComponent, h, inject, provide } from "vue";
import { describe, expect, it, vi } from "vitest";
import AppointmentsTable from "../../src/components/AppointmentsTable.vue";
import type { Appointment } from "../../src/types";
import type { AppointmentStatusOption } from "../../src/services/appointments";

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

const mountTable = (appointment: Appointment) =>
  mount(AppointmentsTable, {
    props: {
      appointments: [appointment],
      isLoading: false,
      statusOptions,
      statusBadgeClass: () => "",
    },
    global: {
      stubs: {
        DataTable: DataTableStub,
        Column: ColumnStub,
        AutoComplete: true,
      },
    },
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

  it("does not block non-status fields when status is final", () => {
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

    expect(preventDefault).not.toHaveBeenCalled();
    expect(stopPropagation).not.toHaveBeenCalled();
    expect(stopImmediatePropagation).not.toHaveBeenCalled();
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
});

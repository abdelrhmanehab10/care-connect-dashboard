import { mount } from "@vue/test-utils";
import { createPinia } from "pinia";
import { defineComponent, h, inject, provide } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Appointment } from "../../src/types";

const mockState = vi.hoisted(() => ({
  appointments: [] as Appointment[],
  isLoading: false,
  fetchDetails: vi.fn(async () => ({})),
  updateAppointment: vi.fn(async () => ({})),
  refetch: vi.fn(() => Promise.resolve()),
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
    statusOptions: ["confirmed"],
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
  setup(props, { slots }) {
    provide("table-rows", props.value);
    return () => h("div", slots.default ? slots.default() : []);
  },
});

const ColumnStub = defineComponent({
  name: "Column",
  setup(_, { slots }) {
    const rows = inject<Appointment[]>("table-rows", []);
    const data = rows[0] ?? {};
    return () => h("div", slots.body ? slots.body({ data }) : null);
  },
});

describe("AppointmentsTable details loading", () => {
  beforeEach(() => {
    mockState.isLoading = false;
    mockState.refetch.mockClear();
    mockState.fetchDetails.mockClear();
    mockState.updateAppointment.mockClear();
  });

  it("shows a spinner instead of the eye icon while details are loading", async () => {
    const appointment: Appointment = {
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
      status: "confirmed",
      nurse: { id: 1, name: "Nurse A" },
      doctor: { id: 2, name: "Doctor B" },
      visit_type: "Initial Visit",
      state: "confirmed",
    };
    mockState.appointments = [appointment];
    mockState.fetchDetails.mockImplementation(() => new Promise(() => {}));

    const wrapper = mount(AppointmentsTable, {
      global: {
        plugins: [createPinia()],
        stubs: {
          DataTable: DataTableStub,
          Column: ColumnStub,
          AutoComplete: true,
        },
      },
    });

    const button = wrapper.find("button.cc-icon-btn");
    expect(button.exists()).toBe(true);
    await button.trigger("click");
    expect(button.find("i.fa-spinner").exists()).toBe(true);
    expect(button.find("svg").exists()).toBe(false);
  });
});

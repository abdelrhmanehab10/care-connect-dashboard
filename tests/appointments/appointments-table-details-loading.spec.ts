import { mount } from "@vue/test-utils";
import { defineComponent, h, inject, provide } from "vue";
import { describe, expect, it } from "vitest";
import AppointmentsTable from "../../src/components/AppointmentsTable.vue";
import type { Appointment } from "../../src/types";
import type { AppointmentStatus } from "../../src/data/options";

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
  it("shows a spinner instead of the eye icon while details are loading", () => {
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

    const wrapper = mount(AppointmentsTable, {
      props: {
        appointments: [appointment],
        isLoading: false,
        detailsLoadingId: 101,
        statusOptions: ["confirmed"] as AppointmentStatus[],
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

    const button = wrapper.find("button.cc-icon-btn");
    expect(button.exists()).toBe(true);
    expect(button.find("i.fa-spinner").exists()).toBe(true);
    expect(button.find("svg").exists()).toBe(false);
  });
});

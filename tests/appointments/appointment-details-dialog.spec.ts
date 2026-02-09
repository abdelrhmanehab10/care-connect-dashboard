import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import AppointmentDetailsDialog from "../../src/components/AppointmentDetailsDialog.vue";
import type { Appointment } from "../../src/types";

const DialogStub = {
  props: ["visible"],
  template: "<div><slot name='header' /><slot /><slot name='footer' /></div>",
};

const RouterLinkStub = {
  template: "<a><slot /></a>",
};

const mountDialog = (appointment: Appointment) =>
  mount(AppointmentDetailsDialog, {
    props: {
      modelValue: true,
      appointment,
    },
    global: {
      stubs: {
        Dialog: DialogStub,
        "router-link": RouterLinkStub,
      },
    },
  });

describe("AppointmentDetailsDialog", () => {
  it("renders API fields such as patient address and care team", () => {
    const appointment = {
      id: 23,
      patient: {
        id: 3,
        name: "API Patient",
        date_of_birth: "1992-01-01",
        phone: "01000000000",
      },
      start_time: "02:02:00",
      end_time: "04:02:00",
      date: "2026/02/14",
      status: "new",
      nurse: { id: 4, name: "Sara Ali" },
      doctor: { id: 1, name: "Ahmed Mohamed" },
      visit_type: "Follow up",
      state: "new",
      patient_address: {
        address: "123 Main St",
        city: "Cairo",
      },
      care_team: [
        {
          employee: { id: 4, name: "Sara Ali" },
          role: "nurse",
          start_time: "02:00:00",
          end_time: "04:00:00",
        },
      ],
    } as Appointment;

    const wrapper = mountDialog(appointment);

    expect(wrapper.text()).toContain("API Patient");
    expect(wrapper.text()).toContain("Follow up");
    expect(wrapper.text()).toContain("123 Main St");
  });
});

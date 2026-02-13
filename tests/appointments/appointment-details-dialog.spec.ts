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

const AppointmentEditReasonDialogStub = {
  props: ["visible", "reasonText", "isSubmitting", "errorMessage"],
  emits: ["update:visible", "update:reasonText", "confirm", "cancel"],
  template: "<div data-test='edit-reason-dialog-stub' />",
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
        AppointmentEditReasonDialog: AppointmentEditReasonDialogStub,
      },
    },
  });

const formatDateSlash = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}/${month}/${day}`;
};

const createBaseAppointment = (overrides?: Partial<Appointment>) =>
  ({
    id: 23,
    patient: {
      id: 3,
      name: "API Patient",
      date_of_birth: "1992-01-01",
      phone: "01000000000",
    },
    start_time: "02:02:00",
    end_time: "04:02:00",
    date: formatDateSlash(new Date()),
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
      {
        employee: { id: 1, name: "Ahmed Mohamed" },
        role: "doctor",
        start_time: "02:00:00",
        end_time: "04:00:00",
      },
    ],
    ...overrides,
  }) as Appointment;

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

  it("enables Check In only when all employees are confirmed and appointment is today", () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const notAllConfirmed = createBaseAppointment({
      date: formatDateSlash(today),
      confirmations: [{ employee_id: 4, confirmed: true }] as any,
    } as Partial<Appointment>);
    const notToday = createBaseAppointment({
      date: formatDateSlash(yesterday),
      confirmations: [
        { employee_id: 4, confirmed: true },
        { employee_id: 1, confirmed: true },
      ] as any,
    } as Partial<Appointment>);
    const readyForCheckIn = createBaseAppointment({
      date: formatDateSlash(today),
      confirmations: [
        { employee_id: 4, confirmed: true },
        { employee_id: 1, confirmed: true },
      ] as any,
    } as Partial<Appointment>);

    const firstWrapper = mountDialog(notAllConfirmed);
    expect(firstWrapper.get(".cc-btn-primary").attributes("disabled")).toBeDefined();

    const secondWrapper = mountDialog(notToday);
    expect(secondWrapper.get(".cc-btn-primary").attributes("disabled")).toBeDefined();

    const thirdWrapper = mountDialog(readyForCheckIn);
    expect(thirdWrapper.get(".cc-btn-primary").attributes("disabled")).toBeUndefined();
  });
});

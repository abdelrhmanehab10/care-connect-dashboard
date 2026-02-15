import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import AppointmentDialog from "../../src/components/AppointmentDialog.vue";

vi.mock("../../src/services/visitTypes", () => ({
  fetchVisitTypes: vi.fn().mockResolvedValue([
    {
      id: "2",
      name: "Initial Visit",
      providers: ["nurses", "doctors", "social_workers"],
      duration: null,
    },
  ]),
}));

vi.mock("../../src/services/employees", () => ({
  fetchEmployeesByTitle: vi.fn().mockResolvedValue([]),
}));

const DialogStub = {
  props: ["visible"],
  template: "<div><slot name='header' /><slot /><slot name='footer' /></div>",
};

const mountDialog = (appointment: unknown = null) =>
  mount(AppointmentDialog, {
    props: {
      modelValue: true,
      appointment,
      patientOptions: [],
      nurseOptions: [],
      doctorOptions: [],
      socialWorkerOptions: [],
      visitTypeOptions: [],
      weekdayOptions: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
    },
    global: {
      stubs: {
        Dialog: DialogStub,
        AutoComplete: true,
        DatePicker: true,
        ToggleSwitch: true,
        AppointmentMap: true,
        AppointmentEditReasonDialog: true,
      },
    },
  });

const submitForm = async (wrapper: ReturnType<typeof mountDialog>) => {
  const vm = wrapper.vm as any;
  if (typeof vm.submitForm === "function") {
    await vm.submitForm();
  } else {
    await wrapper.find("form").trigger("submit");
  }
  await flushPromises();
  await wrapper.vm.$nextTick();
};

const setValidBaseState = async (wrapper: ReturnType<typeof mountDialog>) => {
  const vm = wrapper.vm as any;
  vm.selectedPatient = {
    id: "3",
    name: "Test Patient",
    primary_nurse_id: "4",
    primary_doctor_id: "8",
    primary_social_worker_id: "9",
    primary_driver_id: "10",
  };
  vm.visit.type = "Initial Visit";
  vm.schedule.isRecurring = false;
  vm.schedule.appointmentDate = new Date("2026-01-31T00:00:00");
  vm.schedule.appointmentStartTime = "04:02";
  vm.schedule.appointmentEndTime = "06:02";
  await wrapper.vm.$nextTick();
};

describe("AppointmentDialog payload contract", () => {
  it("emits non-recurring payload with main employee IDs when primary is selected", async () => {
    const wrapper = mountDialog();
    await setValidBaseState(wrapper);

    await submitForm(wrapper);

    const emitted = wrapper.emitted("save");
    expect(emitted?.length).toBe(1);
    const payload = emitted?.[0]?.[0] as Record<string, unknown>;

    expect(payload.is_recurring).toBe("0");
    expect(payload.main_nurse).toBe("1");
    expect(payload.main_nurse_id).toBe("4");
    expect(payload.main_doctor).toBe("1");
    expect(payload.main_doctor_id).toBe("8");
    expect(payload.main_social_worker).toBe("1");
    expect(payload.main_social_worker_id).toBe("9");
    expect(payload.main_driver_id).toBe("");
    expect(payload.employee_slots).toBeUndefined();
    expect(payload.employee_recurring_slots).toBeUndefined();
  });

  it("emits recurring payload with day indexes and recurring employee slots", async () => {
    const wrapper = mountDialog();
    await setValidBaseState(wrapper);

    const vm = wrapper.vm as any;
    vm.schedule.isRecurring = true;
    vm.schedule.recurringStartDate = new Date("2026-02-12T00:00:00");
    vm.schedule.recurringEndDate = new Date("2027-02-12T00:00:00");
    vm.recurrenceRows = [
      {
        id: "row-1",
        day: "Monday",
        startTime: new Date("2026-02-12T02:50:00"),
        endTime: new Date("2026-02-12T04:50:00"),
      },
      {
        id: "row-2",
        day: "Friday",
        startTime: new Date("2026-02-13T02:50:00"),
        endTime: new Date("2026-02-13T04:50:00"),
      },
    ];
    vm.doctorAssignmentMode = "custom";
    vm.doctorScheduleType = "custom";
    vm.doctorName = "Doctor A";
    vm.doctorRecurrenceRows = [
      {
        id: "doc-row-1",
        day: "Monday",
        startTime: new Date("2026-02-12T03:50:00"),
        endTime: new Date("2026-02-12T04:50:00"),
      },
      {
        id: "doc-row-2",
        day: "Friday",
        startTime: new Date("2026-02-13T03:50:00"),
        endTime: new Date("2026-02-13T04:50:00"),
      },
    ];
    await wrapper.vm.$nextTick();

    await submitForm(wrapper);

    const emitted = wrapper.emitted("save");
    expect(emitted?.length).toBe(1);
    const payload = emitted?.[0]?.[0] as Record<string, any>;

    expect(payload.is_recurring).toBe("1");
    expect(payload.start_date).toBe("2026-02-12");
    expect(payload.end_date).toBe("2027-02-12");
    expect(payload.appointments).toEqual([
      { day: "0", start_time: "02:50", end_time: "04:50" },
      { day: "4", start_time: "02:50", end_time: "04:50" },
    ]);
    expect(payload.employee_recurring_slots?.doctor).toEqual([
      { day: "0", start_time: "03:50", end_time: "04:50" },
      { day: "4", start_time: "03:50", end_time: "04:50" },
    ]);
    expect(payload.employee_slots).toBeUndefined();
  });

  it("in edit mode emits save only after reason confirmation", async () => {
    const wrapper = mountDialog({
      id: 11,
      patient: { id: 3, name: "Patient X" },
      date: "2026-02-12",
      start_time: "02:50",
      end_time: "04:50",
      visit_type: "Initial Visit",
      status: "new",
      nurse: { id: 4, name: "Nurse A" },
      doctor: { id: 8, name: "Doctor A" },
      social_worker: null,
    });
    await setValidBaseState(wrapper);

    await submitForm(wrapper);

    expect(wrapper.emitted("save")).toBeUndefined();

    const vm = wrapper.vm as any;
    vm.reasonText = "Needs correction";
    vm.confirmReasonAndSave();
    await flushPromises();

    const emitted = wrapper.emitted("save");
    expect(emitted?.length).toBe(1);
    expect(emitted?.[0]?.[1]).toBe("Needs correction");
  });
});

import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import AppointmentDialog from "../../src/components/AppointmentDialog.vue";

vi.mock("../../src/services/areas", () => ({
  fetchAreas: vi.fn().mockResolvedValue([]),
}));

vi.mock("../../src/services/visitTypes", () => ({
  fetchVisitTypes: vi.fn().mockResolvedValue([
    {
      id: "2",
      name: "Initial Visit",
      providers: ["nurses", "doctors", "social_workers"],
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

const mountDialog = () =>
  mount(AppointmentDialog, {
    props: {
      modelValue: true,
      patientOptions: [],
      nurseOptions: [],
      doctorOptions: [],
      socialWorkerOptions: [],
      areaOptions: [],
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
  vm.selectedPatient = { id: "3", name: "Test Patient" };
  vm.visit.type = "Initial Visit";
  vm.address.area = "1";
  vm.address.city = "Cairo";
  vm.address.street = "123 Main St";
  vm.schedule.isRecurring = false;
  vm.schedule.appointmentDate = new Date("2026-01-31T00:00:00");
  vm.schedule.appointmentStartTime = new Date("2026-01-31T04:02:00");
  vm.schedule.appointmentEndTime = new Date("2026-01-31T06:02:00");
  await wrapper.vm.$nextTick();
};

describe("AppointmentDialog add appointment", () => {
  it("blocks submit when required fields are missing", async () => {
    const wrapper = mountDialog();
    await submitForm(wrapper);

    expect(wrapper.emitted("save")).toBeUndefined();
    expect(wrapper.text()).toContain("Patient is required.");
    expect(wrapper.text()).toContain("Visit type is required.");
    expect(wrapper.text()).toContain("Date is required.");
    expect(wrapper.text()).toContain("Start time is required.");
    expect(wrapper.text()).toContain("End time is required.");
  });

  it("blocks submit when custom nurse is selected without times", async () => {
    const wrapper = mountDialog();
    await setValidBaseState(wrapper);

    const vm = wrapper.vm as any;
    vm.nurseAssignmentMode = "custom";
    vm.nurseName = "Nurse A";
    vm.nurseSchedule.startTime = null;
    vm.nurseSchedule.endTime = null;
    await wrapper.vm.$nextTick();

    await submitForm(wrapper);

    expect(wrapper.emitted("save")).toBeUndefined();
    expect(wrapper.text()).toContain("Nurse start and end time are required.");
  });

  it("emits payload for primary assignments without employee_slots", async () => {
    const wrapper = mountDialog();
    await setValidBaseState(wrapper);

    await submitForm(wrapper);

    const emitted = wrapper.emitted("save");
    expect(emitted?.length).toBe(1);

    const payload = emitted?.[0]?.[0] as {
      patient_id: string;
      visit_type_id: string;
      main_nurse?: string;
      main_doctor?: string;
      main_social_worker?: string;
      employee_slots?: unknown;
    };

    expect(payload.patient_id).toBe("3");
    expect(payload.visit_type_id).toBe("2");
    expect(payload.main_nurse).toBe("1");
    expect(payload.main_doctor).toBe("1");
    expect(payload.main_social_worker).toBe("1");
    expect(payload.employee_slots).toBeUndefined();
  });

  it("emits custom nurse employee_slots for non-recurring schedule", async () => {
    const wrapper = mountDialog();
    await setValidBaseState(wrapper);

    const vm = wrapper.vm as any;
    vm.nurseAssignmentMode = "custom";
    vm.nurseName = "Nurse A";
    vm.nurseSchedule.startTime = new Date("2026-01-31T04:00:00");
    vm.nurseSchedule.endTime = new Date("2026-01-31T05:00:00");
    await wrapper.vm.$nextTick();

    await submitForm(wrapper);

    const emitted = wrapper.emitted("save");
    expect(emitted?.length).toBe(1);

    const payload = emitted?.[0]?.[0] as {
      main_nurse?: string;
      employee_slots?: { nurse?: { start_time: string; end_time: string } };
    };

    expect(payload.main_nurse).toBe("0");
    expect(payload.employee_slots?.nurse).toEqual({
      start_time: "04:00",
      end_time: "05:00",
    });
  });

  it("emits recurring doctor slots when custom and recurring", async () => {
    const wrapper = mountDialog();
    await setValidBaseState(wrapper);

    const vm = wrapper.vm as any;
    vm.schedule.isRecurring = true;
    vm.schedule.recurringStartDate = new Date("2026-01-31T00:00:00");
    vm.recurrenceRows = [
      {
        id: "row-1",
        day: "Monday",
        startTime: new Date("2026-01-31T07:00:00"),
        endTime: new Date("2026-01-31T08:00:00"),
      },
    ];
    vm.doctorAssignmentMode = "custom";
    vm.doctorScheduleType = "custom";
    vm.doctorName = "Doctor A";
    vm.doctorRecurrenceRows = [
      { id: "row-1", day: "Monday", startTime: new Date("2026-01-31T08:00:00"), endTime: new Date("2026-01-31T09:00:00") },
      { id: "row-2", day: "Wednesday", startTime: new Date("2026-01-31T10:00:00"), endTime: new Date("2026-01-31T11:00:00") },
    ];
    await wrapper.vm.$nextTick();

    await submitForm(wrapper);

    const emitted = wrapper.emitted("save");
    expect(emitted?.length).toBe(1);

    const payload = emitted?.[0]?.[0] as {
      main_doctor?: string;
      employee_slots?: { doctor?: Array<{ day: string; start_time: string; end_time: string }> };
    };

    expect(payload.main_doctor).toBe("0");
    expect(payload.employee_slots?.doctor).toEqual([
      { day: "Monday", start_time: "08:00", end_time: "09:00" },
      { day: "Wednesday", start_time: "10:00", end_time: "11:00" },
    ]);
  });

  it("emits custom social worker slots for non-recurring schedule", async () => {
    const wrapper = mountDialog();
    await setValidBaseState(wrapper);

    const vm = wrapper.vm as any;
    vm.socialWorkerAssignmentMode = "custom";
    vm.socialWorkerName = "Social Worker A";
    vm.socialWorkerSchedule.startTime = new Date("2026-01-31T05:30:00");
    vm.socialWorkerSchedule.endTime = new Date("2026-01-31T06:00:00");
    await wrapper.vm.$nextTick();

    await submitForm(wrapper);

    const emitted = wrapper.emitted("save");
    expect(emitted?.length).toBe(1);

    const payload = emitted?.[0]?.[0] as {
      main_social_worker?: string;
      employee_slots?: { social_worker?: { start_time: string; end_time: string } };
    };

    expect(payload.main_social_worker).toBe("0");
    expect(payload.employee_slots?.social_worker).toEqual({
      start_time: "05:30",
      end_time: "06:00",
    });
  });

  it("blocks submit when recurring custom social worker has missing times", async () => {
    const wrapper = mountDialog();
    await setValidBaseState(wrapper);

    const vm = wrapper.vm as any;
    vm.schedule.isRecurring = true;
    vm.schedule.recurringStartDate = new Date("2026-01-31T00:00:00");
    vm.recurrenceRows = [
      {
        id: "row-1",
        day: "Monday",
        startTime: new Date("2026-01-31T07:00:00"),
        endTime: new Date("2026-01-31T08:00:00"),
      },
    ];
    vm.socialWorkerAssignmentMode = "custom";
    vm.socialWorkerScheduleType = "custom";
    vm.socialWorkerName = "Social Worker A";
    vm.socialWorkerRecurrenceRows = [
      { id: "row-1", day: "Monday", startTime: new Date("2026-01-31T08:00:00"), endTime: null },
    ];
    await wrapper.vm.$nextTick();

    await submitForm(wrapper);

    expect(wrapper.emitted("save")).toBeUndefined();
    expect(wrapper.text()).toContain("Social worker start and end time are required.");
  });
});

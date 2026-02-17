import { ref } from "vue";
import { flushPromises, shallowMount } from "@vue/test-utils";
import { createPinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AppointmentsPage from "../../src/pages/AppointmentsPage.vue";

const mocks = vi.hoisted(() => ({
  createAppointment: vi.fn().mockResolvedValue({}),
  updateAppointment: vi.fn().mockResolvedValue({}),
  fetchAppointmentDetails: vi.fn().mockResolvedValue({}),
  fetchAppointmentStatuses: vi.fn().mockResolvedValue([]),
  fetchAppointmentCards: vi.fn().mockResolvedValue({
    total: 0,
    by_status: [],
    periods: { today: 0, this_week: 0, this_month: 0 },
  }),
  fetchVisitTypes: vi.fn().mockResolvedValue([]),
  refetch: vi.fn(),
  toastAdd: vi.fn(),
  routerPush: vi.fn(),
  setQueriesData: vi.fn(),
  getQueriesData: vi.fn(() => []),
}));

vi.mock("../../src/services/appointments", () => ({
  createAppointment: mocks.createAppointment,
  updateAppointment: mocks.updateAppointment,
  fetchAppointmentDetails: mocks.fetchAppointmentDetails,
  fetchAppointmentStatuses: mocks.fetchAppointmentStatuses,
  fetchAppointmentCards: mocks.fetchAppointmentCards,
}));

vi.mock("../../src/services/visitTypes", () => ({
  fetchVisitTypes: mocks.fetchVisitTypes,
}));

vi.mock("../../src/composables/useAppointmentsQuery", () => ({
  statusBadgeClass: vi.fn(() => "cc-badge--neutral"),
  useAppointmentsQuery: vi.fn(() => ({
    appointments: ref([]),
    data: ref({
      currentPage: 1,
      hasMorePages: false,
      total: 0,
      perPage: 10,
    }),
    isLoading: ref(false),
    statusOptions: ref([]),
    refetch: mocks.refetch,
  })),
}));

vi.mock("@tanstack/vue-query", () => ({
  useQueryClient: vi.fn(() => ({
    setQueriesData: mocks.setQueriesData,
    getQueriesData: mocks.getQueriesData,
  })),
}));

vi.mock("primevue/usetoast", () => ({
  useToast: vi.fn(() => ({ add: mocks.toastAdd })),
}));

vi.mock("vue-router", () => ({
  useRouter: vi.fn(() => ({ push: mocks.routerPush })),
}));

vi.mock("../../src/components/AppointmentsFilters.vue", () => ({
  default: { name: "AppointmentsFilters", template: "<div />" },
}));

vi.mock("../../src/components/AppointmentsTable.vue", () => ({
  default: { name: "AppointmentsTable", template: "<div />" },
}));

vi.mock("../../src/components/AppointmentsCalendar.vue", () => ({
  default: { name: "AppointmentsCalendar", template: "<div />" },
}));

vi.mock("../../src/components/AppointmentDialog.vue", () => ({
  default: { name: "AppointmentDialog", template: "<div />" },
}));

vi.mock("../../src/components/AppointmentDetailsDialog.vue", () => ({
  default: { name: "AppointmentDetailsDialog", template: "<div />" },
}));

const mountPage = () =>
  shallowMount(AppointmentsPage, {
    global: {
      plugins: [createPinia()],
      stubs: {
        Button: true,
        Tab: true,
        TabList: true,
        TabPanel: true,
        TabPanels: true,
        Tabs: true,
        AppointmentsFilters: true,
        AppointmentsTable: true,
        AppointmentsCalendar: true,
        AppointmentDialog: true,
        AppointmentDetailsDialog: true,
      },
    },
  });

describe("AppointmentsPage save API flow", () => {
  beforeEach(() => {
    mocks.createAppointment.mockClear();
    mocks.updateAppointment.mockClear();
    mocks.fetchAppointmentDetails.mockClear();
    mocks.fetchAppointmentStatuses.mockClear();
    mocks.fetchAppointmentCards.mockClear();
    mocks.fetchVisitTypes.mockClear();
    mocks.refetch.mockClear();
    mocks.toastAdd.mockClear();
    mocks.routerPush.mockClear();
    mocks.setQueriesData.mockClear();
    mocks.getQueriesData.mockClear();
  });

  it("sends create payload to createAppointment", async () => {
    const wrapper = mountPage();
    await flushPromises();

    const payload = {
      patient_id: "3",
      new_address: {
        address: "PM7G+C4F, Al Olaya, Riyadh 12251, Saudi Arabia",
        lat: "24.7135517",
        lng: "46.6752957",
      },
      visit_type_id: "2",
      is_recurring: "1",
      start_date: "2026-02-12",
      end_date: "2027-02-12",
      appointments: [
        { day: "0", start_time: "02:50", end_time: "04:50" },
        { day: "4", start_time: "02:50", end_time: "04:50" },
      ],
      main_nurse: "1",
      nurse_id: "",
      nurse_schedule_type: "custom",
      employee_recurring_slots: {
        nurse: [
          { day: "0", start_time: "03:50", end_time: "04:50" },
          { day: "4", start_time: "03:50", end_time: "04:50" },
        ],
      },
      main_doctor: "1",
      doctor_id: "",
      doctor_schedule_type: "same",
      main_social_worker: "1",
      social_worker_id: "",
      social_worker_schedule_type: "same",
      driver_schedule_type: "same",
      driver_id: "",
      instructions: "",
    } as const;

    const vm = wrapper.vm as any;
    await vm.handleSaveAppointment(payload);

    expect(mocks.createAppointment).toHaveBeenCalledTimes(1);
    expect(mocks.createAppointment).toHaveBeenCalledWith(payload);
    expect(mocks.updateAppointment).not.toHaveBeenCalled();
    expect(mocks.refetch).toHaveBeenCalledTimes(1);
  });

  it("sends edit payload to updateAppointment with reason", async () => {
    const wrapper = mountPage();
    await flushPromises();

    const payload = {
      patient_id: "3",
      new_address: {
        address: "PM7G+C4F, Al Olaya, Riyadh 12251, Saudi Arabia",
        lat: "24.7135517",
        lng: "46.6752957",
      },
      visit_type_id: "2",
      is_recurring: "1",
      start_date: "2026-02-12",
      end_date: "2027-02-12",
      appointments: [{ day: "0", start_time: "02:50", end_time: "04:50" }],
      instructions: "",
    } as const;

    const vm = wrapper.vm as any;
    vm.editingAppointment = { id: 55 };

    await vm.handleSaveAppointment(payload, "Needed due to schedule change");

    expect(mocks.updateAppointment).toHaveBeenCalledTimes(1);
    expect(mocks.updateAppointment).toHaveBeenCalledWith(
      55,
      expect.objectContaining({
        ...payload,
        reason: "Needed due to schedule change",
      }),
    );
    expect(mocks.createAppointment).not.toHaveBeenCalled();
    expect(mocks.refetch).toHaveBeenCalledTimes(1);
  });
});

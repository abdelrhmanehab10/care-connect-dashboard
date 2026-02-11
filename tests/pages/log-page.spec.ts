import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { reactive } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import LogPage from "../../src/pages/LogPage.vue";
import { fetchAppointmentLog } from "../../src/services/appointments";

const routeState = reactive({
  params: {
    appointmentId: "101",
  },
});

const pushMock = vi.fn();

vi.mock("vue-router", () => ({
  useRoute: () => routeState,
  useRouter: () => ({
    push: pushMock,
  }),
}));

vi.mock("../../src/services/appointments", () => ({
  fetchAppointmentLog: vi.fn(),
}));

describe("LogPage", () => {
  let wrapper: VueWrapper | null = null;

  beforeEach(() => {
    routeState.params.appointmentId = "101";
    pushMock.mockReset();
    vi.mocked(fetchAppointmentLog).mockReset();
    vi.mocked(fetchAppointmentLog).mockResolvedValue([]);
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
  });

  it("fetches logs on page init using route appointmentId", async () => {
    vi.mocked(fetchAppointmentLog).mockResolvedValue([
      {
        employee: "Nurse A",
        patient: "Patient B",
        action: "checked_in",
        time: "2026-02-11 10:00:00",
      },
    ]);

    wrapper = mount(LogPage);
    await flushPromises();

    expect(fetchAppointmentLog).toHaveBeenCalledWith(101);
    expect(wrapper.text()).toContain("Nurse A");
    expect(wrapper.text()).toContain("Patient B");
  });

  it("shows invalid id message and skips fetch when route param is invalid", async () => {
    routeState.params.appointmentId = "invalid";
    vi.mocked(fetchAppointmentLog).mockResolvedValue([]);

    wrapper = mount(LogPage);
    await flushPromises();

    expect(fetchAppointmentLog).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain("Invalid appointment id.");
  });

  it("navigates back to appointments page", async () => {
    vi.mocked(fetchAppointmentLog).mockResolvedValue([]);
    wrapper = mount(LogPage);
    await flushPromises();

    await wrapper
      .find("button.cc-tab-link")
      .trigger("click");

    expect(pushMock).toHaveBeenCalledWith("/appointments");
  });
});

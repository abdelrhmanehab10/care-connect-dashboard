import { describe, expect, it, vi } from "vitest";

vi.mock("../../src/pages/AppointmentsPage.vue", () => ({
  default: { name: "AppointmentsPage" },
}));

vi.mock("../../src/pages/LogPage.vue", () => ({
  default: { name: "LogPage" },
}));

import { routes } from "../../src/router";

describe("router routes", () => {
  it("defines appointments and log routes", () => {
    const routePaths = routes.map((route) => route.path);

    expect(routePaths).toContain("/");
    expect(routePaths).toContain("/appointments");
    expect(routePaths).toContain("/log/:appointmentId");
  });
});

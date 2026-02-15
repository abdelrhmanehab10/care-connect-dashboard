import { describe, expect, it } from "vitest";
import {
  formatStatusLabel,
  getStatusLevel,
  isFinalStatus,
  isStatusTransitionAllowed,
  normalizeStatusKey,
} from "../../src/lib/statusTransitions";

describe("statusTransitions", () => {
  it("normalizes status keys consistently", () => {
    expect(normalizeStatusKey("Patient Confirmed")).toBe("patient_confirmed");
    expect(normalizeStatusKey("patient-confirmed")).toBe("patient_confirmed");
    expect(normalizeStatusKey("  NO_SHOW  ")).toBe("no_show");
  });

  it("formats status labels for UI display", () => {
    expect(formatStatusLabel("patient_confirmed")).toBe("Patient Confirmed");
    expect(formatStatusLabel("no-show")).toBe("No Show");
    expect(formatStatusLabel("waiting")).toBe("Waiting");
    expect(formatStatusLabel("")).toBe("-");
    expect(formatStatusLabel(null)).toBe("-");
  });

  it("applies expected status levels and final-state checks", () => {
    expect(getStatusLevel("new")).toBe(1);
    expect(getStatusLevel("patient_confirmed")).toBe(2);
    expect(getStatusLevel("completed")).toBe(3);
    expect(isFinalStatus("completed")).toBe(true);
    expect(isFinalStatus("no_show")).toBe(true);
    expect(isFinalStatus("waiting")).toBe(false);
  });

  it("enforces transition rules", () => {
    expect(isStatusTransitionAllowed("new", "waiting")).toBe(true);
    expect(isStatusTransitionAllowed("waiting", "patient_confirmed")).toBe(true);
    expect(isStatusTransitionAllowed("patient_confirmed", "completed")).toBe(
      true,
    );
    expect(isStatusTransitionAllowed("patient_confirmed", "waiting")).toBe(
      false,
    );
    expect(isStatusTransitionAllowed("completed", "waiting")).toBe(false);
  });
});

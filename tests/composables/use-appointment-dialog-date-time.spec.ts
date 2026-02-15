import { describe, expect, it } from "vitest";
import {
  durationHoursToMs,
  formatDate,
  formatDurationHoursLabel,
  formatMinutesToClock,
  formatNativeDateValue,
  formatTime,
  normalizeTimeInput,
  parseClockToMinutes,
  parseDateOnly,
  parseDateTime,
  parseNativeDateValue,
} from "../../src/composables/useAppointmentDialogDateTime";
import { toIsoDate } from "../../src/lib/dateUtils";

describe("useAppointmentDialogDateTime", () => {
  it("normalizes and parses local date values", () => {
    expect(formatNativeDateValue(new Date(2026, 1, 14))).toBe("2026-02-14");
    expect(toIsoDate(parseNativeDateValue("2026-02-14") as Date)).toBe(
      "2026-02-14",
    );
    expect(parseNativeDateValue("")).toBe(null);
  });

  it("formats and parses time values", () => {
    expect(formatTime("2:05:00")).toBe("02:05");
    expect(formatTime(new Date("2026-02-14T03:40:00"))).toBe("03:40");
    expect(normalizeTimeInput("3:09:59")).toBe("03:09");
    expect(parseClockToMinutes("03:40")).toBe(220);
    expect(parseClockToMinutes("25:00")).toBe(null);
  });

  it("builds clock values from minute offsets", () => {
    expect(formatMinutesToClock(220)).toBe("03:40");
    expect(formatMinutesToClock(24 * 60 + 5)).toBe("00:05");
    expect(formatMinutesToClock(-5)).toBe("23:55");
  });

  it("handles duration helpers", () => {
    expect(durationHoursToMs(1.5)).toBe(5400000);
    expect(formatDurationHoursLabel(2)).toBe("2 hours");
    expect(formatDurationHoursLabel(1)).toBe("1 hour");
  });

  it("parses date-only and date-time inputs", () => {
    expect(formatDate(new Date(2026, 1, 14))).toBe("2026-02-14");
    expect(toIsoDate(parseDateOnly("2026/02/14") as Date)).toBe("2026-02-14");
    const dateTime = parseDateTime("2026-02-14", "03:40") as Date;
    expect(toIsoDate(dateTime)).toBe("2026-02-14");
    expect(formatTime(dateTime)).toBe("03:40");
    expect(parseDateTime("", "03:40")).toBe(null);
  });
});

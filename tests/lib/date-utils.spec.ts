import { describe, expect, it } from "vitest";
import {
  endOfMonth,
  endOfWeekMonday,
  isSameCalendarDay,
  normalizeDateString,
  parseLocalDateOnly,
  startOfMonth,
  startOfWeekMonday,
  toIsoDate,
} from "../../src/lib/dateUtils";

describe("dateUtils", () => {
  it("normalizes date strings across supported formats", () => {
    expect(normalizeDateString("2026-02-15")).toBe("2026-02-15");
    expect(normalizeDateString("2026/02/15")).toBe("2026-02-15");
    expect(normalizeDateString("2026-02-15T09:10:11Z")).toBe("2026-02-15");
    expect(normalizeDateString("2026-02-15 09:10:11")).toBe("2026-02-15");
    expect(normalizeDateString("2/5/2026")).toBe("2026-02-05");
  });

  it("returns empty string for invalid date input", () => {
    expect(normalizeDateString("not-a-date")).toBe("");
    expect(normalizeDateString("2026-13-99")).toBe("");
    expect(normalizeDateString("")).toBe("");
    expect(normalizeDateString(null)).toBe("");
    expect(normalizeDateString(undefined)).toBe("");
  });

  it("parses local date only safely", () => {
    const parsed = parseLocalDateOnly("2026-02-15T10:00:00");
    expect(parsed).toBeTruthy();
    expect(parsed ? toIsoDate(parsed) : "").toBe("2026-02-15");
    expect(parseLocalDateOnly("2026-99-99")).toBeNull();
  });

  it("computes Monday-based week boundaries", () => {
    const date = new Date(2026, 1, 15); // Sunday, Feb 15 2026
    const weekStart = startOfWeekMonday(date);
    const weekEnd = endOfWeekMonday(date);

    expect(toIsoDate(weekStart)).toBe("2026-02-09");
    expect(toIsoDate(weekEnd)).toBe("2026-02-15");
  });

  it("computes month boundaries and same-day comparison", () => {
    const date = new Date(2026, 1, 15);
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);

    expect(toIsoDate(monthStart)).toBe("2026-02-01");
    expect(toIsoDate(monthEnd)).toBe("2026-02-28");
    expect(isSameCalendarDay(monthStart, new Date(2026, 1, 1))).toBe(true);
    expect(isSameCalendarDay(monthStart, monthEnd)).toBe(false);
  });
});

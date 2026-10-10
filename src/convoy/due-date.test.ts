import { describe, expect, it } from "vitest";
import { formatDueDate, parisToday, parseDueDate } from "./due-date.ts";

const OCT_10 = new Date("2026-10-10T12:00:00Z");

describe("parseDueDate", () => {
  it("reads JJ/MM in the current year", () => {
    expect(parseDueDate("12/10", OCT_10)).toBe("2026-10-12");
    expect(parseDueDate("1/11", OCT_10)).toBe("2026-11-01");
  });

  it("keeps a recent past date in the current year", () => {
    expect(parseDueDate("08/10", OCT_10)).toBe("2026-10-08");
  });

  it("reads an early-year date typed in autumn as next year", () => {
    expect(parseDueDate("05/01", OCT_10)).toBe("2027-01-05");
  });

  it("reads an explicit year", () => {
    expect(parseDueDate("05/01/2026", OCT_10)).toBe("2026-01-05");
  });

  it.each(["31/02", "00/10", "12-10", "demain", ""])("rejects %s", (text) => {
    expect(parseDueDate(text, OCT_10)).toBeNull();
  });
});

describe("parisToday", () => {
  it("uses the Paris calendar day", () => {
    // 23:30 UTC on 10 October is already 11 October in Paris (UTC+2).
    expect(parisToday(new Date("2026-10-10T23:30:00Z"))).toBe("2026-10-11");
  });
});

describe("formatDueDate", () => {
  it("shows JJ/MM", () => {
    expect(formatDueDate("2026-10-12")).toBe("12/10");
  });
});

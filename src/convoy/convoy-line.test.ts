import { describe, expect, it } from "vitest";
import { parseConvoyLines, requestForRecipient } from "./convoy-line.ts";
import { type ConvoyRequest, type Member, createRequest, validateRequest } from "./request.ts";

const NOW = new Date("2026-10-10T12:00:00Z");

describe("parseConvoyLines", () => {
  // Saturday 10 October 2026, 20:21 in Paris.
  const PASTED_AT = new Date("2026-10-10T18:21:00Z");

  it("reads the line the game shows after sending a convoy, arrival included", () => {
    expect(
      parseConvoyLines(
        "Vous allez livrer 0 nourritures et 30 000 materiaux à Alice dans 6H 21m 17s - Retour le 11 oct. à 02h42 - Annuler",
        PASTED_AT,
      ),
    ).toEqual([
      {
        amounts: { food: 0, materials: 30_000 },
        recipient: "Alice",
        arrivesAt: new Date("2026-10-11T00:42:00Z"),
      },
    ]);
  });

  it("reads the arrival time some players' tools add, from the day it is posted", () => {
    const [today] = parseConvoyLines(
      "Vous allez livrer 0 nourritures et 40 000 materiaux à Bruno dans 3H 29m 0s · arrivée aujourd'hui 23 h 50",
      PASTED_AT,
    );
    expect(today?.arrivesAt).toEqual(new Date("2026-10-10T21:50:00Z"));
    const [tomorrow] = parseConvoyLines(
      "Vous allez livrer 0 nourritures et 10 000 materiaux à Bruno dans 1J 2H 12m 0s · arrivée demain 22 h 33",
      new Date("2026-10-31T19:00:00Z"),
    );
    expect(tomorrow?.arrivesAt).toEqual(new Date("2026-11-01T21:33:00Z"));
  });

  it("adds the travel time to now when the line gives no arrival time", () => {
    const [line] = parseConvoyLines(
      "Vous allez livrer 0 nourritures et 40 000 materiaux à Bruno dans 1J 6H 38m 39s",
      PASTED_AT,
    );
    expect(line?.arrivesAt).toEqual(new Date("2026-10-12T00:59:39Z"));
  });

  it("reads several convoys pasted together, with or without line breaks", () => {
    const first =
      "Vous allez livrer 0 nourritures et 30 000 materiaux à Alice dans 6H 21m 17s - Retour le 11 oct. à 02h42 - Annuler";
    const second = "Vous allez livrer 1 500 nourritures et 40 000 materiaux à Bruno dans 41m 30s";
    for (const pasted of [`${first}\n${second}`, `${first} ${second}`]) {
      const lines = parseConvoyLines(pasted, PASTED_AT);
      expect(lines.map((line) => [line.recipient, line.amounts])).toEqual([
        ["Alice", { food: 0, materials: 30_000 }],
        ["Bruno", { food: 1_500, materials: 40_000 }],
      ]);
      expect(lines[1]?.arrivesAt).toEqual(new Date("2026-10-10T19:02:30Z"));
    }
  });

  it("places a return date across the new year in the right year", () => {
    const [line] = parseConvoyLines(
      "Vous allez livrer 0 nourritures et 10 materiaux à Alice dans 5H 0m 0s - Retour le 01 janv. à 03h00",
      new Date("2026-12-31T23:00:00Z"),
    );
    expect(line?.arrivesAt).toEqual(new Date("2027-01-01T02:00:00Z"));
  });

  it("finds nothing in text without a convoy line", () => {
    expect(parseConvoyLines("Reste 250k", PASTED_AT)).toEqual([]);
  });
});

describe("requestForRecipient", () => {
  const alice: Member = { discordId: "1", name: "Alice [FARM]" };
  const bruno: Member = { discordId: "2", name: "Bruno" };

  function active(id: number, requester: Member): ConvoyRequest {
    const request = createRequest(
      id,
      { requester, building: "Couveuse", level: 10, amounts: { food: 0, materials: 100 }, dueDate: null },
      NOW,
    );
    return validateRequest(request, bruno, NOW);
  }

  it("picks the only active request of the recipient, ignoring tags in their Discord name", () => {
    expect(requestForRecipient([active(1, bruno), active(2, alice)], "alice", NOW).id).toBe(2);
  });

  it("ignores pending requests when an active one exists", () => {
    const pending = createRequest(
      3,
      { requester: alice, building: "Couveuse", level: 11, amounts: { food: 0, materials: 100 }, dueDate: null },
      NOW,
    );
    expect(requestForRecipient([pending, active(2, alice)], "Alice", NOW).id).toBe(2);
  });

  it("asks for the number when the recipient has no active request", () => {
    expect(() => requestForRecipient([active(1, bruno)], "Alice", NOW)).toThrow("Aucune demande en cours pour Alice");
  });

  it("says when the recipient's request still waits for validation", () => {
    const pending = createRequest(
      3,
      { requester: alice, building: "Couveuse", level: 11, amounts: { food: 0, materials: 100 }, dueDate: null },
      NOW,
    );
    expect(() => requestForRecipient([pending], "Alice", NOW)).toThrow("n° 3) n'est pas encore validée");
  });

  it("falls back on a request completed in the last day, for convoys sent while others completed it", () => {
    const done = (closedAt: Date): ConvoyRequest => ({ ...active(5, alice), status: "done", closedAt });
    expect(requestForRecipient([done(new Date("2026-10-10T02:00:00Z"))], "Alice", NOW).id).toBe(5);
    expect(() => requestForRecipient([done(new Date("2026-10-09T02:00:00Z"))], "Alice", NOW)).toThrow(
      "Aucune demande en cours",
    );
  });

  it("asks for the number when the recipient has several active requests", () => {
    expect(() => requestForRecipient([active(1, alice), active(4, alice)], "Alice", NOW)).toThrow("n° 1, n° 4");
  });
});

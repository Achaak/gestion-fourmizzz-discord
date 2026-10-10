import { describe, expect, it } from "vitest";
import type { ConvoyLine } from "./convoy-line.ts";
import { declarationSummary, declareConvoys } from "./declare.ts";
import type { Member } from "./request.ts";
import { MemoryConvoyStore } from "./store.ts";

const alice: Member = { discordId: "1", name: "Alice" };
const bruno: Member = { discordId: "2", name: "Bruno" };
const chloe: Member = { discordId: "3", name: "Chloé" };

function convoy(recipient: string, materials: number): ConvoyLine {
  return { recipient, amounts: { food: 0, materials }, arrivesAt: null };
}

async function storeWithRequests() {
  const store = new MemoryConvoyStore(() => new Date("2026-10-10T12:00:00Z"));
  for (const requester of [alice, bruno]) {
    const { id } = await store.create({
      requester,
      building: "Couveuse",
      level: 12,
      amounts: { food: 0, materials: 100_000 },
      dueDate: null,
    });
    await store.validate(id, chloe);
  }
  return store;
}

describe("declareConvoys", () => {
  it("records each convoy on its recipient's request, all convoys counting", async () => {
    const store = await storeWithRequests();
    const lines = [convoy("Alice", 60_000), convoy("Bruno", 30_000), convoy("Alice", 50_000)];
    const results = await declareConvoys(store, chloe, lines, null);
    expect(results.map((request) => [request.id, request.status, request.deliveries.length])).toEqual([
      [1, "done", 2],
      [2, "active", 1],
    ]);
    expect(declarationSummary(lines.length, results)).toBe(
      [
        "🚚 Merci ! 3 convois enregistrés.",
        "- Demande n° 1 (Alice) : entièrement livrée.",
        "- Demande n° 2 (Bruno) : reste 70 000 matériaux.",
      ].join("\n"),
    );
  });

  it("records nothing when one recipient has no request", async () => {
    const store = await storeWithRequests();
    await expect(declareConvoys(store, chloe, [convoy("Alice", 10), convoy("David", 10)], null)).rejects.toThrow(
      "Aucune demande en cours pour David",
    );
    expect((await store.list()).every((request) => request.deliveries.length === 0)).toBe(true);
  });

  it("puts every convoy on the given request number", async () => {
    const store = await storeWithRequests();
    const [result] = await declareConvoys(store, chloe, [convoy("Inconnu", 10)], 2);
    expect(result?.id).toBe(2);
  });
});

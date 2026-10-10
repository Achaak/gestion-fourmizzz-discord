import { describe, expect, it } from "vitest";
import type { ConvoyLine } from "./convoy-line.ts";
import { declarationSummary, declareConvoys } from "./declare.ts";
import type { Member } from "./request.ts";
import { MemoryConvoyStore } from "./store.ts";

const alice: Member = { discordId: "1", name: "Alice" };
const bruno: Member = { discordId: "2", name: "Bruno" };
const chloe: Member = { discordId: "3", name: "Chloé" };

const NOW = new Date("2026-10-10T12:00:00Z");

function convoy(recipient: string, materials: number, arrivesAt = new Date("2026-10-10T18:00:00Z")): ConvoyLine {
  return { recipient, amounts: { food: 0, materials }, arrivesAt };
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
    const declaration = await declareConvoys(store, chloe, lines, null, NOW);
    expect(declaration.requests.map((request) => [request.id, request.status, request.deliveries.length])).toEqual([
      [1, "done", 2],
      [2, "active", 1],
    ]);
    expect(declarationSummary(declaration)).toBe(
      [
        "🚚 Merci ! 3 convois enregistrés.",
        "- Demande n° 1 (Alice) : entièrement livrée.",
        "- Demande n° 2 (Bruno) : reste 70 000 matériaux.",
      ].join("\n"),
    );
  });

  it("records nothing when one recipient has no request", async () => {
    const store = await storeWithRequests();
    await expect(declareConvoys(store, chloe, [convoy("Alice", 10), convoy("David", 10)], null, NOW)).rejects.toThrow(
      "Aucune demande en cours pour David",
    );
    expect((await store.list()).every((request) => request.deliveries.length === 0)).toBe(true);
  });

  it("puts every convoy on the given request number", async () => {
    const store = await storeWithRequests();
    const { requests } = await declareConvoys(store, chloe, [convoy("Inconnu", 10), convoy("Inconnu", 20)], 2, NOW);
    expect(requests.map((request) => [request.id, request.deliveries.length])).toEqual([[2, 2]]);
  });

  it("refuses one request number for convoys to several recipients", async () => {
    const store = await storeWithRequests();
    await expect(declareConvoys(store, chloe, [convoy("Alice", 10), convoy("Bruno", 10)], 2, NOW)).rejects.toThrow(
      "plusieurs destinataires (Alice, Bruno)",
    );
  });

  it("records nothing when one convoy breaks a rule", async () => {
    const store = await storeWithRequests();
    await expect(declareConvoys(store, chloe, [convoy("Alice", 10), convoy("Bruno", 0)], null, NOW)).rejects.toThrow(
      "Indiquez la nourriture ou les matériaux livrés",
    );
    expect((await store.list()).every((request) => request.deliveries.length === 0)).toBe(true);
  });

  it("skips convoys the same member already declared, e.g. posted then pasted in /livrer", async () => {
    const store = await storeWithRequests();
    await declareConvoys(store, chloe, [convoy("Alice", 10)], null, NOW);
    // Without a "Retour le" time the arrival is counted from the post, a few seconds apart.
    const again = [convoy("Alice", 10, new Date("2026-10-10T18:00:40Z")), convoy("Bruno", 20)];
    const declaration = await declareConvoys(store, chloe, again, null, NOW);
    expect(declaration).toMatchObject({ recorded: 1, duplicates: 1 });
    expect((await store.list()).map((request) => request.deliveries.length)).toEqual([1, 1]);
    expect(declarationSummary(declaration)).toBe(
      [
        "🚚 Merci ! Convoi enregistré (1 déjà déclaré, ignoré).",
        "- Demande n° 2 (Bruno) : reste 99 980 matériaux.",
      ].join("\n"),
    );
  });

  it("keeps identical convoys pasted together: the player sent them twice", async () => {
    const store = await storeWithRequests();
    const { recorded } = await declareConvoys(store, chloe, [convoy("Alice", 10), convoy("Alice", 10)], null, NOW);
    expect(recorded).toBe(2);
  });

  it("refuses a declaration made only of convoys already declared", async () => {
    const store = await storeWithRequests();
    await declareConvoys(store, chloe, [convoy("Alice", 10)], null, NOW);
    await expect(declareConvoys(store, chloe, [convoy("Alice", 10)], null, NOW)).rejects.toThrow("déjà déclaré");
  });

  it("does not take the same convoy from another member for a duplicate", async () => {
    const store = await storeWithRequests();
    await declareConvoys(store, chloe, [convoy("Alice", 10)], null, NOW);
    expect((await declareConvoys(store, bruno, [convoy("Alice", 10)], null, NOW)).recorded).toBe(1);
  });

  it("notes a surplus on a request completed before the convoy was declared", async () => {
    const store = await storeWithRequests();
    await declareConvoys(store, chloe, [convoy("Alice", 100_000)], null, NOW);
    const declaration = await declareConvoys(store, bruno, [convoy("Alice", 5_000)], null, NOW);
    expect(declarationSummary(declaration)).toBe(
      ["🚚 Merci ! Convoi enregistré.", "- Demande n° 1 (Alice) : déjà entièrement livrée, le surplus est noté."].join(
        "\n",
      ),
    );
  });
});

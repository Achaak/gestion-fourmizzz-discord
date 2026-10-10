import { describe, expect, it } from "vitest";
import { MESSAGE_LIMIT, nextArrival, renderBoard } from "./board.ts";
import type { Member } from "./request.ts";
import { MemoryConvoyStore } from "./store.ts";

const NOW = new Date("2026-10-10T11:36:00Z");
const alice: Member = { discordId: "1", name: "Alice" };
const bruno: Member = { discordId: "2", name: "Bruno" };
const chloe: Member = { discordId: "3", name: "Chloé" };

async function sampleStore() {
  const store = new MemoryConvoyStore(() => NOW);
  const warehouse = await store.create({
    requester: alice,
    building: "Entrepôt de matériaux",
    level: 12,
    amounts: { food: 0, materials: 1_512_000 },
    dueDate: "2026-10-12",
  });
  await store.validate(warehouse.id, bruno);
  await store.deliver(warehouse.id, chloe, [{ amounts: { food: 0, materials: 1_240_000 }, arrivesAt: null }]);
  await store.create({
    requester: chloe,
    building: "Champignonnière",
    level: 15,
    amounts: { food: 0, materials: 2_100_000 },
    dueDate: null,
  });
  const done = await store.create({
    requester: bruno,
    building: "Couveuse",
    level: 17,
    amounts: { food: 500, materials: 0 },
    dueDate: null,
  });
  await store.validate(done.id, alice);
  await store.deliver(done.id, chloe, [{ amounts: { food: 200, materials: 0 }, arrivesAt: null }]);
  await store.deliver(done.id, alice, [{ amounts: { food: 300, materials: 0 }, arrivesAt: null }]);
  return store;
}

describe("renderBoard", () => {
  it("shows active, pending and done requests", async () => {
    const board = renderBoard(await (await sampleStore()).list(), NOW);
    expect(board).toMatchInlineSnapshot(`
      "**📦 Convois** · mis à jour <t:1791632160:f>
      \`\`\`
      ▶ EN COURS
        #  Joueur        Demande                 Pour   Avancement
        1  Alice         Entrepôt de matériaux…  12/10  ████████░░  82 %
                         Matériaux  1 240 000 / 1 512 000 · reste 272 000

      ⏳ EN ATTENTE DE VALIDATION
        #  Joueur        Demande                 Pour   Total
        2  Chloé         Champignonnière 15      —      2 100 000 mat.

      ✅ TERMINÉES (7 derniers jours)
        #  Joueur        Demande                 Le     Livreurs
        3  Bruno         Couveuse 17             10/10  Chloé, Alice
      \`\`\`
      -# \`/demande\` pour demander un convoi · postez ici la ligne « Vous allez livrer … » du jeu pour déclarer vos envois"
    `);
  });

  it("shows convoys on the way until they arrive", async () => {
    const store = new MemoryConvoyStore(() => NOW);
    const { id } = await store.create({
      requester: alice,
      building: "Couveuse",
      level: 18,
      amounts: { food: 0, materials: 100_000 },
      dueDate: null,
    });
    await store.validate(id, bruno);
    await store.deliver(id, chloe, [
      { amounts: { food: 0, materials: 40_000 }, arrivesAt: new Date("2026-10-10T16:50:00Z") },
      { amounts: { food: 0, materials: 30_000 }, arrivesAt: new Date("2026-10-10T13:42:00Z") },
      { amounts: { food: 0, materials: 10_000 }, arrivesAt: new Date("2026-10-10T10:00:00Z") },
    ]);
    const requests = await store.list();
    expect(renderBoard(requests, NOW)).toContain(
      [
        "                   En route   30 000 mat. · Chloé · 10/10 15:42",
        "                              40 000 mat. · Chloé · 10/10 18:50",
      ].join("\n"),
    );
    expect(renderBoard(requests, NOW)).not.toContain("10 000 mat. · Chloé");
    expect(nextArrival(requests, NOW)).toEqual(new Date("2026-10-10T13:42:00Z"));
    expect(renderBoard(requests, new Date("2026-10-10T17:00:00Z"))).not.toContain("En route");
  });

  it("invites to make a request when there is none", () => {
    expect(renderBoard([], NOW)).toContain("Aucune demande en cours");
  });

  it("drops done requests older than 7 days", async () => {
    const store = await sampleStore();
    expect(renderBoard(await store.list(), new Date("2026-10-18T12:00:00Z"))).not.toContain("TERMINÉES");
  });

  it("stays under Discord's limit by cutting the last sections first", async () => {
    const store = new MemoryConvoyStore(() => NOW);
    for (let i = 0; i < 60; i++) {
      const request = await store.create({
        requester: alice,
        building: "Couveuse",
        level: i,
        amounts: { food: 1_000, materials: 1_000 },
        dueDate: null,
      });
      if (i < 8) await store.validate(request.id, bruno);
    }
    const board = renderBoard(await store.list(), NOW);
    expect(board.length).toBeLessThanOrEqual(MESSAGE_LIMIT);
    expect(board).toContain("Couveuse 7");
    expect(board).toMatch(/… et \d+ de plus/);
  });
});

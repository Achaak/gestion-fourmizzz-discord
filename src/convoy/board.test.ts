import { describe, expect, it } from "vitest";
import { MESSAGE_LIMIT, renderBoard } from "./board.ts";
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
  await store.deliver(warehouse.id, chloe, { food: 0, materials: 1_240_000 });
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
  await store.deliver(done.id, chloe, { food: 200, materials: 0 });
  await store.deliver(done.id, alice, { food: 300, materials: 0 });
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
      \`\`\`"
    `);
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
      if (i < 10) await store.validate(request.id, bruno);
    }
    const board = renderBoard(await store.list(), NOW);
    expect(board.length).toBeLessThanOrEqual(MESSAGE_LIMIT);
    expect(board).toContain("Couveuse 9");
    expect(board).toMatch(/… et \d+ de plus/);
  });
});

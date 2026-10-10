import { describe, expect, it } from "vitest";
import {
  type Board,
  MAX_COMPONENTS,
  MAX_TEXT_LENGTH,
  componentCount,
  nextArrival,
  renderBoard,
  textLength,
} from "./board.ts";
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

/** The board as plain text: boxes start with their colour, lines between blocks are "───". */
function asText(board: Board): string {
  const boxes = board.sections.map((section) => `[#${section.accent.toString(16)}]\n${section.blocks.join("\n───\n")}`);
  return [board.header, ...boxes, board.footer].join("\n\n");
}

describe("renderBoard", () => {
  it("shows active, pending and done requests", async () => {
    const board = renderBoard(await (await sampleStore()).list(), NOW);
    expect(asText(board)).toMatchInlineSnapshot(`
      "# 📦 Convois de l'alliance
      -# 1 en cours · 1 en attente · mis à jour <t:1791632160:R>

      [#3ba55c]
      ### 🚚 En cours
      ───
      **n° 1 · Entrepôt de matériaux 12** · <@1>
      🟩🟩🟩🟩🟩🟩🟩🟩⬜⬜ **82 %** · 📅 pour le 12/10
      🪵 1 240 000 / 1 512 000 matériaux · reste **272 000**

      [#f0b232]
      ### ⏳ En attente de validation
      **n° 2 · Champignonnière 15** · <@3> · 2 100 000 mat.
      -# Un responsable des convois les valide avec \`/valider\`.

      [#80848e]
      ### ✅ Terminées ces 7 derniers jours
      **n° 3 · Couveuse 17** · <@2> · le 10/10 · merci Chloé, Alice

      -# 📝 \`/demande\` pour demander un convoi · 🚚 postez ici la ligne « Vous allez livrer … » du jeu pour déclarer vos envois"
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
    const text = asText(renderBoard(requests, NOW));
    expect(text).toContain(
      [
        "🚚 30 000 mat. de Chloé · arrive <t:1791639720:R> (<t:1791639720:t>)",
        "🚚 40 000 mat. de Chloé · arrive <t:1791651000:R> (<t:1791651000:t>)",
      ].join("\n"),
    );
    expect(text).not.toContain("10 000 mat. de Chloé");
    expect(nextArrival(requests, NOW)).toEqual(new Date("2026-10-10T13:42:00Z"));
    expect(asText(renderBoard(requests, new Date("2026-10-10T17:00:00Z")))).not.toContain(" · arrive ");
  });

  it("invites to make a request when there is none", () => {
    expect(asText(renderBoard([], NOW))).toContain("Aucune demande en cours");
  });

  it("drops done requests older than 7 days", async () => {
    const store = await sampleStore();
    expect(asText(renderBoard(await store.list(), new Date("2026-10-18T12:00:00Z")))).not.toContain("Terminées");
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
    expect(componentCount(board)).toBeLessThanOrEqual(MAX_COMPONENTS);
    expect(textLength(board)).toBeLessThanOrEqual(MAX_TEXT_LENGTH);
    expect(asText(board)).toContain("Couveuse 7**");
    expect(asText(board)).toMatch(/… et \d+ de plus/);
  });
});

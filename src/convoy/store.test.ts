import { describe, expect, it } from "vitest";
import { ConvoyError, type Member, progress, remaining } from "./request.ts";
import { MemoryConvoyStore } from "./store.ts";

const alice: Member = { discordId: "1", name: "Alice" };
const chloe: Member = { discordId: "2", name: "Chloé" };
const chief: Member = { discordId: "3", name: "David" };

function newStore() {
  return new MemoryConvoyStore(() => new Date("2026-10-10T12:00:00Z"));
}

function ask(store: MemoryConvoyStore, amounts = { food: 0, materials: 1_000 }) {
  return store.create({ requester: alice, building: "Couveuse", level: 18, amounts, dueDate: null });
}

describe("MemoryConvoyStore", () => {
  it("numbers requests and starts them pending", async () => {
    const store = newStore();
    const first = await ask(store);
    const second = await ask(store);
    expect([first.id, second.id]).toEqual([1, 2]);
    expect(first.status).toBe("pending");
  });

  it("refuses a request without any quantity", async () => {
    await expect(ask(newStore(), { food: 0, materials: 0 })).rejects.toThrow(ConvoyError);
  });

  it("refuses deliveries before validation", async () => {
    const store = newStore();
    const { id } = await ask(store);
    await expect(store.deliver(id, chloe, [{ amounts: { food: 0, materials: 100 }, arrivesAt: null }])).rejects.toThrow(
      "pas encore validée",
    );
  });

  it("tracks deliveries until the request is done", async () => {
    const store = newStore();
    const { id } = await ask(store);
    await store.validate(id, chief);
    const partial = await store.deliver(id, chloe, [{ amounts: { food: 0, materials: 600 }, arrivesAt: null }]);
    expect(partial.status).toBe("active");
    expect(remaining(partial)).toEqual({ food: 0, materials: 400 });
    expect(progress(partial)).toBe(0.6);
    const done = await store.deliver(id, chief, [{ amounts: { food: 0, materials: 400 }, arrivesAt: null }]);
    expect(done.status).toBe("done");
    expect(done.closedAt).not.toBeNull();
  });

  it("does not let extra food make up for missing materials", async () => {
    const store = newStore();
    const { id } = await ask(store, { food: 1_000, materials: 1_000 });
    await store.validate(id, chief);
    const request = await store.deliver(id, chloe, [{ amounts: { food: 2_000, materials: 0 }, arrivesAt: null }]);
    expect(request.status).toBe("active");
    expect(progress(request)).toBe(0.5);
  });

  it("refuses validating twice", async () => {
    const store = newStore();
    const { id } = await ask(store);
    await store.validate(id, chief);
    await expect(store.validate(id, chief)).rejects.toThrow("n'est pas en attente");
  });

  it("lets only the requester or a manager cancel", async () => {
    const store = newStore();
    const { id } = await ask(store);
    await expect(store.cancel(id, chloe, false)).rejects.toThrow("Seul le demandeur");
    expect((await store.cancel(id, chief, true)).status).toBe("cancelled");
    expect((await store.cancel((await ask(store)).id, alice, false)).status).toBe("cancelled");
  });

  it("reports an unknown request", async () => {
    await expect(newStore().validate(42, chief)).rejects.toThrow("Aucune demande n° 42");
  });
});

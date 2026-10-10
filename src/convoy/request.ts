import { formatDueDate, parisToday } from "./due-date.ts";

/** A Discord member of the alliance. `name` is their server display name (normally their game pseudo). */
export interface Member {
  discordId: string;
  name: string;
}

export interface Amounts {
  food: number;
  materials: number;
}

/** pending: waiting for a manager · active: open for deliveries · done: fully delivered · cancelled. */
export type RequestStatus = "pending" | "active" | "done" | "cancelled";

/** A convoy sent for a request, as declared by its sender. */
export interface NewDelivery {
  amounts: Amounts;
  /** When the convoy reaches the requester, read from the game's line; null when unknown. */
  arrivesAt: Date | null;
}

export interface Delivery extends NewDelivery {
  by: Member;
  /** When it was declared. */
  at: Date;
}

export interface ConvoyRequest {
  id: number;
  requester: Member;
  building: string;
  level: number;
  /** What the requester needs delivered. */
  amounts: Amounts;
  /** Wanted delivery date, "YYYY-MM-DD" (Paris), or null when not urgent. */
  dueDate: string | null;
  status: RequestStatus;
  createdAt: Date;
  validatedBy: Member | null;
  validatedAt: Date | null;
  /** When the request became done or cancelled. */
  closedAt: Date | null;
  deliveries: Delivery[];
}

export interface NewRequest {
  requester: Member;
  building: string;
  level: number;
  amounts: Amounts;
  dueDate: string | null;
}

/** A rule broken by a player's action. The message is shown to them as is. */
export class ConvoyError extends Error {
  override name = "ConvoyError";
}

export function delivered(request: ConvoyRequest): Amounts {
  return request.deliveries.reduce(
    (sum, delivery) => ({
      food: sum.food + delivery.amounts.food,
      materials: sum.materials + delivery.amounts.materials,
    }),
    { food: 0, materials: 0 },
  );
}

export function remaining(request: ConvoyRequest): Amounts {
  const sent = delivered(request);
  return {
    food: Math.max(0, request.amounts.food - sent.food),
    materials: Math.max(0, request.amounts.materials - sent.materials),
  };
}

/** Share delivered, from 0 to 1; an over-delivered resource does not make up for a missing one. */
export function progress(request: ConvoyRequest): number {
  const total = request.amounts.food + request.amounts.materials;
  if (total === 0) return 1;
  const left = remaining(request);
  return (total - left.food - left.materials) / total;
}

export function createRequest(id: number, input: NewRequest, now: Date): ConvoyRequest {
  if (input.amounts.food <= 0 && input.amounts.materials <= 0) {
    throw new ConvoyError("Indiquez une quantité de nourriture ou de matériaux.");
  }
  if (input.amounts.food < 0 || input.amounts.materials < 0) {
    throw new ConvoyError("Une quantité ne peut pas être négative.");
  }
  if (input.dueDate !== null && input.dueDate < parisToday(now)) {
    throw new ConvoyError(`La date souhaitée (${formatDueDate(input.dueDate)}) est déjà passée.`);
  }
  return {
    id,
    ...input,
    status: "pending",
    createdAt: now,
    validatedBy: null,
    validatedAt: null,
    closedAt: null,
    deliveries: [],
  };
}

export function validateRequest(request: ConvoyRequest, by: Member, now: Date): ConvoyRequest {
  if (request.status !== "pending") throw new ConvoyError(`La demande n° ${request.id} n'est pas en attente.`);
  return { ...request, status: "active", validatedBy: by, validatedAt: now };
}

/**
 * Records deliveries sent together by one member; the request becomes done once nothing remains.
 * Several convoys pasted at once all count, even when the first ones already complete the request.
 * A done request still takes convoys, as surplus: they were sent while others completed it, and the
 * alliance keeps every convoy for the consumption follow-up (docs/projet/besoin.md §2).
 */
export function deliverRequest(
  request: ConvoyRequest,
  by: Member,
  deliveries: NewDelivery[],
  now: Date,
): ConvoyRequest {
  if (request.status === "pending") {
    throw new ConvoyError(`La demande n° ${request.id} n'est pas encore validée.`);
  }
  if (request.status === "cancelled") throw new ConvoyError(`La demande n° ${request.id} est annulée.`);
  if (deliveries.length === 0 || deliveries.some(({ amounts }) => amounts.food <= 0 && amounts.materials <= 0)) {
    throw new ConvoyError("Indiquez la nourriture ou les matériaux livrés.");
  }
  const next = {
    ...request,
    deliveries: [...request.deliveries, ...deliveries.map((delivery) => ({ ...delivery, by, at: now }))],
  };
  return request.status === "active" && progress(next) >= 1 ? { ...next, status: "done", closedAt: now } : next;
}

/** Arrivals read from the same line posted twice differ by the seconds between the two posts. */
const SAME_ARRIVAL_MS = 2 * 60_000;

/**
 * Whether `by` already declared this convoy on the request: same sender, same amounts, same arrival
 * within two minutes. A convoy without a known arrival cannot be told from another one.
 */
export function alreadyDeclared(request: ConvoyRequest, by: Member, convoy: NewDelivery): boolean {
  const { arrivesAt } = convoy;
  if (arrivesAt === null) return false;
  return request.deliveries.some(
    (delivery) =>
      delivery.by.discordId === by.discordId &&
      delivery.amounts.food === convoy.amounts.food &&
      delivery.amounts.materials === convoy.amounts.materials &&
      delivery.arrivesAt !== null &&
      Math.abs(delivery.arrivesAt.getTime() - arrivesAt.getTime()) <= SAME_ARRIVAL_MS,
  );
}

/** The requester can cancel their own request; a manager can cancel any open one. */
export function cancelRequest(request: ConvoyRequest, by: Member, asManager: boolean, now: Date): ConvoyRequest {
  if (request.status === "done" || request.status === "cancelled") {
    throw new ConvoyError(`La demande n° ${request.id} est déjà close.`);
  }
  if (!asManager && request.requester.discordId !== by.discordId) {
    throw new ConvoyError("Seul le demandeur ou un responsable des convois peut annuler cette demande.");
  }
  return { ...request, status: "cancelled", closedAt: now };
}

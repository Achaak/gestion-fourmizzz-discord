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

export interface Delivery {
  by: Member;
  amounts: Amounts;
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

/** Records a delivery; the request becomes done once nothing remains. */
export function deliverRequest(request: ConvoyRequest, by: Member, amounts: Amounts, now: Date): ConvoyRequest {
  if (request.status === "pending") {
    throw new ConvoyError(`La demande n° ${request.id} n'est pas encore validée.`);
  }
  if (request.status !== "active") throw new ConvoyError(`La demande n° ${request.id} est close.`);
  if (amounts.food <= 0 && amounts.materials <= 0) {
    throw new ConvoyError("Indiquez la nourriture ou les matériaux livrés.");
  }
  const next = { ...request, deliveries: [...request.deliveries, { by, amounts, at: now }] };
  return progress(next) >= 1 ? { ...next, status: "done", closedAt: now } : next;
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

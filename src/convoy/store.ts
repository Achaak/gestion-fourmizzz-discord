import {
  type Amounts,
  type ConvoyRequest,
  ConvoyError,
  type Member,
  type NewRequest,
  cancelRequest,
  createRequest,
  deliverRequest,
  validateRequest,
} from "./request.ts";

/**
 * Where convoy requests live. Today in memory; later the alliance API (docs/projet/architecture.md),
 * which becomes the source of truth. Every method is async so the bot does not change when it switches.
 */
export interface ConvoyStore {
  create(input: NewRequest): Promise<ConvoyRequest>;
  validate(id: number, by: Member): Promise<ConvoyRequest>;
  deliver(id: number, by: Member, amounts: Amounts): Promise<ConvoyRequest>;
  cancel(id: number, by: Member, asManager: boolean): Promise<ConvoyRequest>;
  list(): Promise<ConvoyRequest[]>;
}

/** Loses everything on restart: only for development until the API exists. */
export class MemoryConvoyStore implements ConvoyStore {
  private readonly requests = new Map<number, ConvoyRequest>();
  private nextId = 1;
  private readonly clock: () => Date;

  constructor(clock: () => Date = () => new Date()) {
    this.clock = clock;
  }

  create(input: NewRequest): Promise<ConvoyRequest> {
    return attempt(() => {
      const request = createRequest(this.nextId, input, this.clock());
      this.nextId += 1;
      return this.save(request);
    });
  }

  validate(id: number, by: Member): Promise<ConvoyRequest> {
    return this.update(id, (request) => validateRequest(request, by, this.clock()));
  }

  deliver(id: number, by: Member, amounts: Amounts): Promise<ConvoyRequest> {
    return this.update(id, (request) => deliverRequest(request, by, amounts, this.clock()));
  }

  cancel(id: number, by: Member, asManager: boolean): Promise<ConvoyRequest> {
    return this.update(id, (request) => cancelRequest(request, by, asManager, this.clock()));
  }

  list(): Promise<ConvoyRequest[]> {
    return Promise.resolve([...this.requests.values()]);
  }

  private update(id: number, change: (request: ConvoyRequest) => ConvoyRequest): Promise<ConvoyRequest> {
    return attempt(() => {
      const request = this.requests.get(id);
      if (!request) throw new ConvoyError(`Aucune demande n° ${id}.`);
      return this.save(change(request));
    });
  }

  private save(request: ConvoyRequest): ConvoyRequest {
    this.requests.set(request.id, request);
    return request;
  }
}

/** Runs a synchronous change so that a broken rule rejects the promise, as a remote store would. */
function attempt<T>(run: () => T): Promise<T> {
  try {
    return Promise.resolve(run());
  } catch (error) {
    return Promise.reject(error instanceof Error ? error : new Error(String(error)));
  }
}

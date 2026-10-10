import { type ConvoyLine, requestForRecipient } from "./convoy-line.ts";
import { formatNumber } from "./quantity.ts";
import { type ConvoyRequest, type Member, type NewDelivery, remaining } from "./request.ts";
import type { ConvoyStore } from "./store.ts";

/**
 * Records convoys a member declares, each on the request of its recipient, or all on `forcedId`.
 * Every request is found before anything is recorded, so a wrong pseudo records nothing.
 * Returns the requests as they stand afterwards.
 */
export async function declareConvoys(
  store: ConvoyStore,
  by: Member,
  lines: ConvoyLine[],
  forcedId: number | null,
): Promise<ConvoyRequest[]> {
  const requests = await store.list();
  const byRequest = new Map<number, NewDelivery[]>();
  for (const { recipient, ...delivery } of lines) {
    const id = forcedId ?? requestForRecipient(requests, recipient).id;
    byRequest.set(id, [...(byRequest.get(id) ?? []), delivery]);
  }
  const results: ConvoyRequest[] = [];
  for (const [id, deliveries] of byRequest) results.push(await store.deliver(id, by, deliveries));
  return results;
}

/** "Merci ! 2 convois enregistrés." followed by what remains on each request. */
export function declarationSummary(convoyCount: number, requests: ConvoyRequest[]): string {
  const convoys = convoyCount > 1 ? `${convoyCount} convois enregistrés` : "Convoi enregistré";
  return [`Merci ! ${convoys}.`, ...requests.map(requestSummary)].join("\n");
}

function requestSummary(request: ConvoyRequest): string {
  const head = `- Demande n° ${request.id} (${request.requester.name})`;
  if (request.status === "done") return `${head} : entièrement livrée.`;
  const left = remaining(request);
  const parts = [
    left.food > 0 ? `${formatNumber(left.food)} nourriture` : "",
    left.materials > 0 ? `${formatNumber(left.materials)} matériaux` : "",
  ].filter(Boolean);
  return `${head} : reste ${parts.join(" et ")}.`;
}

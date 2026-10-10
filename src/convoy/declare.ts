import { type ConvoyLine, requestForRecipient, sameName } from "./convoy-line.ts";
import { formatNumber } from "./quantity.ts";
import {
  type ConvoyRequest,
  ConvoyError,
  type Member,
  type NewDelivery,
  alreadyDeclared,
  deliverRequest,
  remaining,
} from "./request.ts";
import type { ConvoyStore } from "./store.ts";

export interface Declaration {
  /** The requests that received convoys, as they stand afterwards. */
  requests: ConvoyRequest[];
  /** Requests that were already done before these convoys: they took them as surplus. */
  surplus: Set<number>;
  recorded: number;
  /** Convoys the member had already declared, skipped. */
  duplicates: number;
}

/**
 * Records convoys a member declares, each on the request of its recipient, or all on `forcedId`.
 * Every convoy is checked before anything is recorded, so a wrong pseudo or a broken rule records nothing.
 * Convoys the member already declared (the line posted twice, or posted then pasted in `/livrer`) are skipped.
 */
export async function declareConvoys(
  store: ConvoyStore,
  by: Member,
  lines: ConvoyLine[],
  forcedId: number | null,
  now: Date,
): Promise<Declaration> {
  if (forcedId !== null) refuseSeveralRecipients(lines);
  const requests = await store.list();
  const byId = new Map(requests.map((request) => [request.id, request]));
  const toRecord = new Map<number, NewDelivery[]>();
  let duplicates = 0;
  for (const { recipient, ...delivery } of lines) {
    const request = forcedId === null ? requestForRecipient(requests, recipient, now) : byId.get(forcedId);
    if (!request) throw new ConvoyError(`Aucune demande n° ${String(forcedId)}.`);
    if (alreadyDeclared(request, by, delivery)) {
      duplicates += 1;
      continue;
    }
    toRecord.set(request.id, [...(toRecord.get(request.id) ?? []), delivery]);
  }
  if (toRecord.size === 0) {
    throw new ConvoyError(duplicates > 1 ? "Ces convois sont déjà déclarés." : "Ce convoi est déjà déclaré.");
  }
  // The same rules the store applies, run on every request first so that nothing is half recorded.
  for (const [id, deliveries] of toRecord) {
    const request = byId.get(id);
    if (request) deliverRequest(request, by, deliveries, now);
  }

  const surplus = new Set([...toRecord.keys()].filter((id) => byId.get(id)?.status === "done"));
  const results: ConvoyRequest[] = [];
  for (const [id, deliveries] of toRecord) results.push(await store.deliver(id, by, deliveries));
  const recorded = [...toRecord.values()].reduce((sum, deliveries) => sum + deliveries.length, 0);
  return { requests: results, surplus, recorded, duplicates };
}

function refuseSeveralRecipients(lines: ConvoyLine[]): void {
  const recipients = lines
    .map((line) => line.recipient)
    .filter((name, i, all) => all.findIndex((other) => sameName(other, name)) === i);
  if (recipients.length > 1) {
    throw new ConvoyError(
      `Ces convois vont à plusieurs destinataires (${recipients.join(", ")}) : un seul numéro de demande ne peut pas tous les recevoir. Déclarez-les séparément.`,
    );
  }
}

/** "🚚 Merci ! 2 convois enregistrés." followed by what remains on each request. */
export function declarationSummary({ requests, surplus, recorded, duplicates }: Declaration): string {
  const convoys = recorded > 1 ? `${recorded} convois enregistrés` : "Convoi enregistré";
  const skipped =
    duplicates > 0
      ? ` (${duplicates} déjà déclaré${duplicates > 1 ? "s" : ""}, ignoré${duplicates > 1 ? "s" : ""})`
      : "";
  return [`🚚 Merci ! ${convoys}${skipped}.`, ...requests.map((request) => requestSummary(request, surplus))].join(
    "\n",
  );
}

function requestSummary(request: ConvoyRequest, surplus: Set<number>): string {
  const head = `- Demande n° ${request.id} (${request.requester.name})`;
  if (surplus.has(request.id)) return `${head} : déjà entièrement livrée, le surplus est noté.`;
  if (request.status === "done") return `${head} : entièrement livrée.`;
  const left = remaining(request);
  const parts = [
    left.food > 0 ? `${formatNumber(left.food)} nourriture` : "",
    left.materials > 0 ? `${formatNumber(left.materials)} matériaux` : "",
  ].filter(Boolean);
  return `${head} : reste ${parts.join(" et ")}.`;
}

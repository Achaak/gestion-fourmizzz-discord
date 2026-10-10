import { fromParisTime, parisToday } from "./due-date.ts";
import { parseQuantity } from "./quantity.ts";
import { type ConvoyRequest, ConvoyError, type NewDelivery } from "./request.ts";

/** A convoy as the game describes it once sent (docs/fourmizzz/convois.md). */
export interface ConvoyLine extends NewDelivery {
  /** The recipient's game pseudo. */
  recipient: string;
}

// "Vous allez livrer 0 nourritures et 30 000 materiaux à Alice dans 6H 21m 17s - Retour le 10 oct. à 02h42 - Annuler"
// The tail after the travel time runs until the next convoy, so lines may be pasted with or without line breaks.
const CONVOY_LINE =
  /vous allez livrer\s+(\d[\d\s]*?)\s*nourritures?\s+et\s+(\d[\d\s]*?)\s*mat[ée]riaux\s+à\s+([^\n]+?)\s+dans\s+((?:\d+\s*[jhms]\s*)+)(.*?)(?=vous allez livrer|$)/gisu;
// "Retour le 10 oct. à 02h42": despite the word, the time the convoy arrives (Paris time).
const RETURN = /retour le\s+(\d{1,2})\s+(\p{L}+)\.?\s+à\s+(\d{1,2})\s*h\s*(\d{2})/iu;
// "· arrivée aujourd'hui 6 h 50", "· arrivée demain 22 h 33": added by some players' tools, Paris time.
const ARRIVAL_DAY = /arrivée\s+(aujourd['’]hui|demain)\s+(\d{1,2})\s*h\s*(\d{2})/iu;
const TRAVEL_PART = /(\d+)\s*([jhms])/gi;
const SECONDS: Record<string, number> = { j: 86_400, h: 3_600, m: 60, s: 1 };
const MONTHS = ["jan", "fev", "mar", "avr", "mai", "juin", "juil", "aou", "sep", "oct", "nov", "dec"];

/**
 * Finds every convoy line of the game in pasted text. The arrival is the "Retour le" time when present,
 * then the "arrivée aujourd'hui/demain" time, otherwise `now` plus the travel time.
 */
export function parseConvoyLines(text: string, now: Date): ConvoyLine[] {
  return [...text.matchAll(CONVOY_LINE)].map((match) => {
    const [, foodText = "", materialsText = "", recipient = "", travel = "", tail = ""] = match;
    const food = parseQuantity(foodText);
    const materials = parseQuantity(materialsText);
    if (food === null || materials === null) throw new ConvoyError(`Quantité illisible dans « ${match[0].trim()} ».`);
    return {
      amounts: { food, materials },
      recipient: recipient.trim(),
      arrivesAt:
        returnTime(tail, now) ?? dayArrival(tail, now) ?? new Date(now.getTime() + travelSeconds(travel) * 1000),
    };
  });
}

function travelSeconds(travel: string): number {
  return [...travel.matchAll(TRAVEL_PART)].reduce(
    (sum, [, value = "0", unit = "s"]) => sum + Number(value) * (SECONDS[unit.toLowerCase()] ?? 0),
    0,
  );
}

/** "aujourd'hui" and "demain" are counted from the day the line is posted, in Paris. */
function dayArrival(tail: string, now: Date): Date | null {
  const [, dayWord, hour, minute] = ARRIVAL_DAY.exec(tail) ?? [];
  if (!dayWord || !hour || !minute) return null;
  const [year = 0, month = 0, day = 0] = parisToday(now).split("-").map(Number);
  const tomorrow = dayWord.toLowerCase() === "demain" ? 1 : 0;
  // Date.UTC rolls the day over into the next month when needed.
  const date = new Date(Date.UTC(year, month - 1, day + tomorrow));
  return fromParisTime(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), Number(hour), Number(minute));
}

/** The year is not written: the one that puts the arrival closest to now. */
function returnTime(tail: string, now: Date): Date | null {
  const [, day, monthName, hour, minute] = RETURN.exec(tail) ?? [];
  if (!day || !monthName || !hour || !minute) return null;
  const word = monthName.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const month = MONTHS.findIndex((prefix) => word.startsWith(prefix)) + 1;
  if (month === 0) return null;
  const year = now.getUTCFullYear();
  const candidates = [year - 1, year, year + 1].map((y) =>
    fromParisTime(y, month, Number(day), Number(hour), Number(minute)),
  );
  return candidates.reduce((best, date) =>
    Math.abs(date.getTime() - now.getTime()) < Math.abs(best.getTime() - now.getTime()) ? date : best,
  );
}

/** A convoy declared this long after its request was completed was most likely sent before. */
const RECENTLY_DONE_MS = 86_400_000;

/**
 * The request a convoy goes to, found by its recipient: their active request, or failing that the one
 * completed in the last day (the convoy was sent while others completed it). A member's Discord name is
 * normally their game pseudo, sometimes with a tag such as "[FARM]" that is ignored.
 */
export function requestForRecipient(requests: ConvoyRequest[], recipient: string, now: Date): ConvoyRequest {
  const own = requests.filter((request) => sameName(request.requester.name, recipient));
  const active = own.filter((request) => request.status === "active");
  const [only] = active;
  if (only && active.length === 1) return only;
  if (active.length > 1) {
    const numbers = active.map((request) => `n° ${request.id}`).join(", ");
    throw new ConvoyError(`${recipient} a plusieurs demandes en cours (${numbers}). Précisez le numéro de la demande.`);
  }
  const recentlyDone = own
    .filter(
      (request) =>
        request.status === "done" && request.closedAt && now.getTime() - request.closedAt.getTime() <= RECENTLY_DONE_MS,
    )
    .sort((a, b) => (b.closedAt?.getTime() ?? 0) - (a.closedAt?.getTime() ?? 0));
  if (recentlyDone[0]) return recentlyDone[0];
  const pending = own.find((request) => request.status === "pending");
  if (pending) {
    throw new ConvoyError(
      `La demande de ${recipient} (n° ${pending.id}) n'est pas encore validée : un responsable des convois doit la valider avec \`/valider\`.`,
    );
  }
  throw new ConvoyError(`Aucune demande en cours pour ${recipient}. Précisez le numéro de la demande.`);
}

export function sameName(a: string, b: string): boolean {
  return normalizeName(a) === normalizeName(b);
}

function normalizeName(name: string): string {
  return name
    .replace(/\[[^\]]*\]|\([^)]*\)/g, " ")
    .trim()
    .toLowerCase();
}

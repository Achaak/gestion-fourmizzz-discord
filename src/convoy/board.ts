import { formatDueDate, formatParisTime, parisToday } from "./due-date.ts";
import { type Amounts, type ConvoyRequest, type Delivery, delivered, progress, remaining } from "./request.ts";
import { formatNumber } from "./quantity.ts";

/** Discord refuses messages over 2 000 characters. */
export const MESSAGE_LIMIT = 2000;
/** Starts every board message: the bot finds its board back by it after a restart. */
export const BOARD_TITLE = "**📦 Convois**";
/** The channel holds nothing but the board, so it reminds how to use it (small text). */
const HELP =
  "-# `/demande` pour demander un convoi · postez ici la ligne « Vous allez livrer … » du jeu pour déclarer vos envois";
const DONE_WINDOW_MS = 7 * 86_400_000;
const NAME_WIDTH = 12;
const DEMAND_WIDTH = 22;
const BAR_WIDTH = 10;
/** Convoys on the way shown per request, soonest first. */
const MAX_ON_THE_WAY = 3;
const INDENT = " ".repeat(3 + 2 + NAME_WIDTH + 2);

interface Section {
  title: string;
  header: string;
  blocks: string[][];
}

/**
 * The single board message of the convoy channel: requests being delivered, waiting for validation,
 * and done in the last 7 days. Sections are cut from the bottom when the message would be too long.
 */
export function renderBoard(requests: ConvoyRequest[], now: Date): string {
  const title = `${BOARD_TITLE} · mis à jour <t:${Math.floor(now.getTime() / 1000)}:f>`;
  const active = requests.filter((r) => r.status === "active").sort(byDueDate);
  const pending = requests.filter((r) => r.status === "pending").sort((a, b) => a.id - b.id);
  const done = requests
    .filter((r) => r.status === "done" && r.closedAt && now.getTime() - r.closedAt.getTime() <= DONE_WINDOW_MS)
    .sort((a, b) => (b.closedAt?.getTime() ?? 0) - (a.closedAt?.getTime() ?? 0));

  if (active.length === 0 && pending.length === 0 && done.length === 0) {
    return `${title}\nAucune demande en cours. Faites \`/demande\` pour en ajouter une.`;
  }

  const sections: Section[] = [
    {
      title: "▶ EN COURS",
      header: row("#", "Joueur", "Demande", "Pour", "Avancement"),
      blocks: active.map((request) => activeBlock(request, now)),
    },
    {
      title: "⏳ EN ATTENTE DE VALIDATION",
      header: row("#", "Joueur", "Demande", "Pour", "Total"),
      blocks: pending.map(pendingBlock),
    },
    {
      title: "✅ TERMINÉES (7 derniers jours)",
      header: row("#", "Joueur", "Demande", "Le", "Livreurs"),
      blocks: done.map((request) => doneBlock(request, now)),
    },
  ];

  // Shown counts per section; shrink the last non-empty section first until the message fits.
  const shown = sections.map((s) => s.blocks.length);
  let message = compose(title, sections, shown);
  for (let i = sections.length - 1; i >= 0 && message.length > MESSAGE_LIMIT; i--) {
    while ((shown[i] ?? 0) > 0 && message.length > MESSAGE_LIMIT) {
      shown[i] = (shown[i] ?? 0) - 1;
      message = compose(title, sections, shown);
    }
  }
  return message;
}

function compose(title: string, sections: Section[], shown: number[]): string {
  const parts = sections.flatMap((section, i) => {
    if (section.blocks.length === 0) return [];
    const count = shown[i] ?? 0;
    const lines = [section.title, section.header, ...section.blocks.slice(0, count).flat()];
    const hidden = section.blocks.length - count;
    if (hidden > 0) lines.push(`  … et ${hidden} de plus`);
    return [lines.join("\n")];
  });
  return `${title}\n\`\`\`\n${parts.join("\n\n")}\n\`\`\`\n${HELP}`;
}

/** When the next convoy on the way arrives, so the board can drop it from the list then. */
export function nextArrival(requests: ConvoyRequest[], now: Date): Date | null {
  const arrivals = requests.flatMap((request) => onTheWay(request, now).map((delivery) => delivery.arrivesAt));
  return arrivals.reduce<Date | null>((soonest, date) => (soonest && soonest <= date ? soonest : date), null);
}

function activeBlock(request: ConvoyRequest, now: Date): string[] {
  const share = progress(request);
  const filled = Math.round(share * BAR_WIDTH);
  const bar = `${"█".repeat(filled)}${"░".repeat(BAR_WIDTH - filled)}  ${Math.floor(share * 100)} %`;
  const sent = delivered(request);
  const left = remaining(request);
  const details: string[] = [];
  if (request.amounts.food > 0) {
    details.push(detail("Nourriture", sent.food, request.amounts.food, left.food));
  }
  if (request.amounts.materials > 0) {
    details.push(detail("Matériaux", sent.materials, request.amounts.materials, left.materials));
  }
  return [requestRow(request, dueDate(request), bar), ...details, ...onTheWayLines(request, now)];
}

function pendingBlock(request: ConvoyRequest): string[] {
  return [requestRow(request, dueDate(request), shortAmounts(request.amounts))];
}

function doneBlock(request: ConvoyRequest, now: Date): string[] {
  const deliverers = [...new Set(request.deliveries.map((d) => d.by.name))].join(", ");
  const closed = request.closedAt ? formatDueDate(parisToday(request.closedAt)) : "—";
  return [requestRow(request, closed, deliverers), ...onTheWayLines(request, now)];
}

function requestRow(request: ConvoyRequest, date: string, last: string): string {
  return row(String(request.id), request.requester.name, `${request.building} ${request.level}`, date, last);
}

function row(id: string, name: string, demand: string, date: string, last: string): string {
  return [id.padStart(3), fit(name, NAME_WIDTH), fit(demand, DEMAND_WIDTH), date.padEnd(5), last].join("  ");
}

/** Lets the requester know when convoys reach them: "En route   30 000 mat. · Chloé · 11/10 02:42". */
function onTheWayLines(request: ConvoyRequest, now: Date): string[] {
  const coming = onTheWay(request, now);
  const lines = coming.slice(0, MAX_ON_THE_WAY).map((delivery, i) => {
    const label = i === 0 ? "En route" : "";
    return `${INDENT}${label.padEnd(11)}${shortAmounts(delivery.amounts)} · ${delivery.by.name} · ${formatParisTime(delivery.arrivesAt)}`;
  });
  const hidden = coming.length - MAX_ON_THE_WAY;
  if (hidden > 0) lines.push(`${INDENT}${"".padEnd(11)}… et ${hidden} autre${hidden > 1 ? "s" : ""}`);
  return lines;
}

function onTheWay(request: ConvoyRequest, now: Date): (Delivery & { arrivesAt: Date })[] {
  return request.deliveries
    .filter(
      (delivery): delivery is Delivery & { arrivesAt: Date } => delivery.arrivesAt !== null && delivery.arrivesAt > now,
    )
    .sort((a, b) => a.arrivesAt.getTime() - b.arrivesAt.getTime());
}

function shortAmounts(amounts: Amounts): string {
  return [
    amounts.food > 0 ? `${formatNumber(amounts.food)} nour.` : "",
    amounts.materials > 0 ? `${formatNumber(amounts.materials)} mat.` : "",
  ]
    .filter(Boolean)
    .join(" + ");
}

function detail(label: string, sent: number, wanted: number, left: number): string {
  return `${INDENT}${label.padEnd(11)}${formatNumber(sent)} / ${formatNumber(wanted)} · reste ${formatNumber(left)}`;
}

function fit(text: string, width: number): string {
  return text.length > width ? `${text.slice(0, width - 1)}…` : text.padEnd(width);
}

function dueDate(request: ConvoyRequest): string {
  return request.dueDate ? formatDueDate(request.dueDate) : "—";
}

/** Soonest wanted date first; requests without a date come last, oldest first. */
function byDueDate(a: ConvoyRequest, b: ConvoyRequest): number {
  if (a.dueDate !== b.dueDate) {
    if (a.dueDate === null) return 1;
    if (b.dueDate === null) return -1;
    return a.dueDate < b.dueDate ? -1 : 1;
  }
  return a.id - b.id;
}

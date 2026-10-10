import { formatDueDate, parisToday } from "./due-date.ts";
import { type ConvoyRequest, delivered, progress, remaining } from "./request.ts";
import { formatNumber } from "./quantity.ts";

/** Discord refuses messages over 2 000 characters. */
export const MESSAGE_LIMIT = 2000;
/** Starts every board message: the bot finds its board back by it after a restart. */
export const BOARD_TITLE = "**📦 Convois**";
const DONE_WINDOW_MS = 7 * 86_400_000;
const NAME_WIDTH = 12;
const DEMAND_WIDTH = 22;
const BAR_WIDTH = 10;

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
      blocks: active.map(activeBlock),
    },
    {
      title: "⏳ EN ATTENTE DE VALIDATION",
      header: row("#", "Joueur", "Demande", "Pour", "Total"),
      blocks: pending.map(pendingBlock),
    },
    {
      title: "✅ TERMINÉES (7 derniers jours)",
      header: row("#", "Joueur", "Demande", "Le", "Livreurs"),
      blocks: done.map(doneBlock),
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
  return `${title}\n\`\`\`\n${parts.join("\n\n")}\n\`\`\``;
}

function activeBlock(request: ConvoyRequest): string[] {
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
  return [requestRow(request, dueDate(request), bar), ...details];
}

function pendingBlock(request: ConvoyRequest): string[] {
  const total = [
    request.amounts.food > 0 ? `${formatNumber(request.amounts.food)} nour.` : "",
    request.amounts.materials > 0 ? `${formatNumber(request.amounts.materials)} mat.` : "",
  ]
    .filter(Boolean)
    .join(" + ");
  return [requestRow(request, dueDate(request), total)];
}

function doneBlock(request: ConvoyRequest): string[] {
  const deliverers = [...new Set(request.deliveries.map((d) => d.by.name))].join(", ");
  const closed = request.closedAt ? formatDueDate(parisToday(request.closedAt)) : "—";
  return [requestRow(request, closed, deliverers)];
}

function requestRow(request: ConvoyRequest, date: string, last: string): string {
  return row(String(request.id), request.requester.name, `${request.building} ${request.level}`, date, last);
}

function row(id: string, name: string, demand: string, date: string, last: string): string {
  return [id.padStart(3), fit(name, NAME_WIDTH), fit(demand, DEMAND_WIDTH), date.padEnd(5), last].join("  ");
}

function detail(label: string, sent: number, wanted: number, left: number): string {
  const indent = " ".repeat(3 + 2 + NAME_WIDTH + 2);
  return `${indent}${label.padEnd(11)}${formatNumber(sent)} / ${formatNumber(wanted)} · reste ${formatNumber(left)}`;
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

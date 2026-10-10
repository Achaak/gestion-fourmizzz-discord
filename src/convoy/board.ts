import { formatDueDate, parisToday } from "./due-date.ts";
import { formatNumber } from "./quantity.ts";
import { type Amounts, type ConvoyRequest, type Delivery, delivered, progress, remaining } from "./request.ts";

/**
 * The board as Discord lays it out (Components V2): a header, one coloured box per section, a footer.
 * Inside a box, blocks are separated by a thin line. Text is Discord markdown.
 */
export interface Board {
  header: string;
  sections: BoardSection[];
  footer: string;
}

export interface BoardSection {
  /** Colour of the box's left stripe, as 0xRRGGBB. */
  accent: number;
  blocks: string[];
}

/** Discord's limits for a Components V2 message: components, nested ones included, and total text. */
export const MAX_COMPONENTS = 40;
export const MAX_TEXT_LENGTH = 4000;

/** Opens every board: the bot finds its board back by it after a restart. */
export const BOARD_HEADING = "# 📦 Convois de l'alliance";

const ACCENT = { active: 0x3ba55c, pending: 0xf0b232, done: 0x80848e, empty: 0x5865f2 } as const;
const DONE_WINDOW_MS = 7 * 86_400_000;
const BAR_WIDTH = 10;
/** Convoys on the way shown per request, soonest first. */
const MAX_ON_THE_WAY = 3;
/** The channel holds nothing but the board, so it reminds how to use it. */
const FOOTER =
  "-# 📝 `/demande` pour demander un convoi · 🚚 postez ici la ligne « Vous allez livrer … » du jeu pour déclarer vos envois";

interface SectionSpec {
  accent: number;
  title: string;
  items: string[];
  /** Items share one text block (short lines) instead of one block each, separated by lines. */
  compact: boolean;
  /** Shown under the items, e.g. who acts next. */
  note?: string;
}

/**
 * The single board message of the convoy channel: requests being delivered, waiting for validation,
 * and done in the last 7 days. Sections are cut from the bottom when the message would be too big.
 */
export function renderBoard(requests: ConvoyRequest[], now: Date): Board {
  const active = requests.filter((r) => r.status === "active").sort(byDueDate);
  const pending = requests.filter((r) => r.status === "pending").sort((a, b) => a.id - b.id);
  const done = requests
    .filter((r) => r.status === "done" && r.closedAt && now.getTime() - r.closedAt.getTime() <= DONE_WINDOW_MS)
    .sort((a, b) => (b.closedAt?.getTime() ?? 0) - (a.closedAt?.getTime() ?? 0));

  const counts = [
    active.length > 0 ? `${active.length} en cours` : "",
    pending.length > 0 ? `${pending.length} en attente` : "",
  ].filter(Boolean);
  const header = [BOARD_HEADING, `-# ${[...counts, `mis à jour ${timestamp(now, "R")}`].join(" · ")}`].join("\n");

  if (active.length + pending.length + done.length === 0) {
    return {
      header,
      sections: [
        { accent: ACCENT.empty, blocks: ["Aucune demande en cours.\nFaites `/demande` pour demander un convoi."] },
      ],
      footer: FOOTER,
    };
  }

  const specs: SectionSpec[] = [
    {
      accent: ACCENT.active,
      title: "### 🚚 En cours",
      items: active.map((request) => activeItem(request, now)),
      compact: false,
    },
    {
      accent: ACCENT.pending,
      title: "### ⏳ En attente de validation",
      items: pending.map(pendingItem),
      compact: true,
      note: "-# Un responsable des convois les valide avec `/valider`.",
    },
    {
      accent: ACCENT.done,
      title: "### ✅ Terminées ces 7 derniers jours",
      items: done.map((request) => doneItem(request, now)),
      compact: true,
    },
  ];

  // Shown counts per section; shrink the last non-empty section first until the message fits.
  const shown = specs.map((spec) => spec.items.length);
  let board = compose(header, specs, shown);
  for (let i = specs.length - 1; i >= 0 && !fits(board); i--) {
    while ((shown[i] ?? 0) > 0 && !fits(board)) {
      shown[i] = (shown[i] ?? 0) - 1;
      board = compose(header, specs, shown);
    }
  }
  return board;
}

/** Components the board uses once laid out: header, footer, and per box the box, its blocks and lines between. */
export function componentCount(board: Board): number {
  return 2 + board.sections.reduce((sum, section) => sum + 2 * section.blocks.length, 0);
}

export function textLength(board: Board): number {
  return [board.header, board.footer, ...board.sections.flatMap((s) => s.blocks)].join("").length;
}

/** When the next convoy on the way arrives, so the board can drop it from the list then. */
export function nextArrival(requests: ConvoyRequest[], now: Date): Date | null {
  const arrivals = requests.flatMap((request) => onTheWay(request, now).map((delivery) => delivery.arrivesAt));
  return arrivals.reduce<Date | null>((soonest, date) => (soonest && soonest <= date ? soonest : date), null);
}

function fits(board: Board): boolean {
  return componentCount(board) <= MAX_COMPONENTS && textLength(board) <= MAX_TEXT_LENGTH;
}

function compose(header: string, specs: SectionSpec[], shown: number[]): Board {
  const sections = specs.flatMap((spec, i) => {
    if (spec.items.length === 0) return [];
    const items = spec.items.slice(0, shown[i] ?? 0);
    const hidden = spec.items.length - items.length;
    const extra = [hidden > 0 ? `-# … et ${hidden} de plus` : "", spec.note ?? ""].filter(Boolean);
    const blocks = spec.compact
      ? [[spec.title, ...items, ...extra].join("\n")]
      : [spec.title, ...items, ...(extra.length > 0 ? [extra.join("\n")] : [])];
    return [{ accent: spec.accent, blocks }];
  });
  return { header, sections, footer: FOOTER };
}

/**
 * **n° 1 · Entrepôt de matériaux 12** · @Alice
 * 🟩🟩🟩🟩🟩🟩🟩🟩⬜⬜ **82 %** · 📅 pour le 12/10
 * 🪵 1 240 000 / 1 512 000 matériaux · reste **272 000**
 * 🚚 30 000 mat. de Chloé · dans 3 heures
 */
function activeItem(request: ConvoyRequest, now: Date): string {
  const share = progress(request);
  const filled = Math.round(share * BAR_WIDTH);
  const bar = `${"🟩".repeat(filled)}${"⬜".repeat(BAR_WIDTH - filled)} **${Math.floor(share * 100)} %**`;
  const sent = delivered(request);
  const left = remaining(request);
  const lines = [title(request), request.dueDate ? `${bar} · 📅 pour le ${formatDueDate(request.dueDate)}` : bar];
  if (request.amounts.food > 0)
    lines.push(resourceLine("🍎", "nourriture", sent.food, request.amounts.food, left.food));
  if (request.amounts.materials > 0) {
    lines.push(resourceLine("🪵", "matériaux", sent.materials, request.amounts.materials, left.materials));
  }
  return [...lines, ...onTheWayLines(request, now)].join("\n");
}

/** **n° 2 · Champignonnière 15** · @Chloé · 2 100 000 mat. · 📅 15/10 */
function pendingItem(request: ConvoyRequest): string {
  const due = request.dueDate ? ` · 📅 ${formatDueDate(request.dueDate)}` : "";
  return `${title(request)} · ${shortAmounts(request.amounts)}${due}`;
}

/** **n° 3 · Couveuse 17** · @Bruno · le 10/10 · merci Chloé, Alice */
function doneItem(request: ConvoyRequest, now: Date): string {
  const deliverers = [...new Set(request.deliveries.map((d) => d.by.name))].join(", ");
  const closed = request.closedAt ? ` · le ${formatDueDate(parisToday(request.closedAt))}` : "";
  return [`${title(request)}${closed} · merci ${deliverers}`, ...onTheWayLines(request, now)].join("\n");
}

/** The requester is a mention: Discord shows their current name, and the board never notifies them. */
function title(request: ConvoyRequest): string {
  return `**n° ${request.id} · ${request.building} ${request.level}** · <@${request.requester.discordId}>`;
}

function resourceLine(icon: string, label: string, sent: number, wanted: number, left: number): string {
  const rest = left > 0 ? ` · reste **${formatNumber(left)}**` : " · ✔";
  return `${icon} ${formatNumber(sent)} / ${formatNumber(wanted)} ${label}${rest}`;
}

/** Lets the requester know when convoys reach them; Discord shows "dans 3 heures" and keeps it current. */
function onTheWayLines(request: ConvoyRequest, now: Date): string[] {
  const coming = onTheWay(request, now);
  const lines = coming
    .slice(0, MAX_ON_THE_WAY)
    .map(
      (delivery) =>
        `🚚 ${shortAmounts(delivery.amounts)} de ${delivery.by.name} · arrive ${timestamp(delivery.arrivesAt, "R")} (${timestamp(delivery.arrivesAt, "t")})`,
    );
  const hidden = coming.length - MAX_ON_THE_WAY;
  if (hidden > 0) lines.push(`-# … et ${hidden} autre${hidden > 1 ? "s" : ""} convoi${hidden > 1 ? "s" : ""} en route`);
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

/** A Discord timestamp, shown in each reader's time: "R" relative ("dans 3 heures"), "t" time ("23:50"). */
function timestamp(date: Date, style: "R" | "t"): string {
  return `<t:${Math.floor(date.getTime() / 1000)}:${style}>`;
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

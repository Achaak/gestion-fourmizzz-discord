import {
  type Client,
  ComponentType,
  ContainerBuilder,
  type GuildTextBasedChannel,
  type Message,
  MessageFlags,
  SeparatorSpacingSize,
  TextDisplayBuilder,
} from "discord.js";
import { BOARD_HEADING, type Board, nextArrival, renderBoard } from "../convoy/board.ts";
import type { ConvoyStore } from "../convoy/store.ts";

/**
 * Keeps one board message in the convoy channel and edits it after every change.
 * After a restart it takes back its last board message instead of posting a new one.
 * It also refreshes itself when the next convoy on the way arrives, so arrived convoys leave the board.
 * The channel holds the board and nothing else: every other message is deleted (docs/adr/0002).
 * The board uses Discord's Components V2: coloured boxes, headings, live relative times.
 */
export class BoardPublisher {
  private readonly client: Client<true>;
  private readonly channelId: string;
  private readonly store: ConvoyStore;
  private message: Message | null = null;
  /** Refreshes run one after the other so two quick commands cannot post two boards. */
  private queue: Promise<void> = Promise.resolve();
  private arrivalTimer: NodeJS.Timeout | undefined;

  constructor(client: Client<true>, channelId: string, store: ConvoyStore) {
    this.client = client;
    this.channelId = channelId;
    this.store = store;
  }

  refresh(): Promise<void> {
    return this.enqueue("Board refresh", () => this.publish());
  }

  /**
   * Publishes the board and deletes the bot's leftover notices. Returns what members posted in the
   * channel while the bot was away (last 100 messages), oldest first, for the caller to handle.
   */
  async start(): Promise<Message[]> {
    await this.refresh();
    const channel = await this.channel();
    const recent = await channel.messages.fetch({ limit: 100 });
    const leftovers = recent.filter((message) => !this.isBoard(message) && !this.isMemberPost(message));
    // Discord deletes in bulk only messages younger than 14 days; older ones go one by one.
    const deleted = await channel.bulkDelete(leftovers, true);
    for (const message of leftovers.values()) {
      if (!deleted.has(message.id)) await message.delete();
    }
    return [...recent.filter((message) => this.isMemberPost(message)).values()].reverse();
  }

  /** A message a member posted in the convoy channel: the bot reads it, then deletes it. */
  isMemberPost(message: Message): boolean {
    return (
      message.channelId === this.channelId &&
      message.author.id !== this.client.user.id &&
      !message.flags.has(MessageFlags.Ephemeral)
    );
  }

  /** Deletes a member's message from the channel. The bot's own notices delete themselves. */
  async sweep(message: Message): Promise<void> {
    if (!this.isMemberPost(message)) return;
    try {
      await message.delete();
    } catch (error) {
      console.error("Could not delete a message in the convoy channel", error);
    }
  }

  /** Posts a short notice under the board, deleted after `lifetimeMs`. Mentions do not notify. */
  async notice(content: string, tone: "success" | "error", lifetimeMs: number): Promise<void> {
    const channel = await this.channel();
    const box = new ContainerBuilder()
      .setAccentColor(NOTICE_ACCENT[tone])
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
    const message = await channel.send({
      components: [box],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { parse: [] },
    });
    setTimeout(() => void message.delete().catch(() => undefined), lifetimeMs);
  }

  private enqueue(what: string, task: () => Promise<void>): Promise<void> {
    this.queue = this.queue.then(task).catch((error: unknown) => {
      console.error(`${what} failed`, error);
    });
    return this.queue;
  }

  private async publish(): Promise<void> {
    const requests = await this.store.list();
    const now = new Date();
    this.scheduleArrival(nextArrival(requests, now), now);
    const payload = {
      components: toComponents(renderBoard(requests, now)),
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { parse: [] },
    } as const;
    this.message ??= await this.findBoard();
    if (this.message) {
      this.message = await this.message.edit(payload);
      return;
    }
    const channel = await this.channel();
    this.message = await channel.send(payload);
  }

  /** The current board, or before the bot has found it, any board it posted. */
  private isBoard(message: Message): boolean {
    if (this.message) return message.id === this.message.id;
    return this.isBoardMessage(message);
  }

  /** A board the bot posted: its first component is the heading. Older text boards are not, and get deleted. */
  private isBoardMessage(message: Message): boolean {
    const [first] = message.components;
    return (
      message.author.id === this.client.user.id &&
      message.flags.has(MessageFlags.IsComponentsV2) &&
      first?.type === ComponentType.TextDisplay &&
      first.content.startsWith(BOARD_HEADING)
    );
  }

  private scheduleArrival(arrival: Date | null, now: Date): void {
    clearTimeout(this.arrivalTimer);
    if (!arrival) return;
    // setTimeout cannot wait longer than ~24 days; a day is plenty, the next refresh plans again.
    const delay = Math.min(arrival.getTime() - now.getTime() + 1000, 86_400_000);
    this.arrivalTimer = setTimeout(() => void this.refresh(), delay);
  }

  private async findBoard(): Promise<Message | null> {
    const channel = await this.channel();
    const recent = await channel.messages.fetch({ limit: 50 });
    return recent.find((message) => this.isBoardMessage(message)) ?? null;
  }

  private async channel(): Promise<GuildTextBasedChannel> {
    const channel = await this.client.channels.fetch(this.channelId);
    if (!channel?.isTextBased() || channel.isDMBased()) {
      throw new Error(`Le salon ${this.channelId} n'est pas un salon textuel du serveur.`);
    }
    return channel;
  }
}

const NOTICE_ACCENT = { success: 0x3ba55c, error: 0xed4245 } as const;

/** Lays the board out: header, one box per section with thin lines between its blocks, footer. */
function toComponents(board: Board): (TextDisplayBuilder | ContainerBuilder)[] {
  const boxes = board.sections.map((section) => {
    const box = new ContainerBuilder().setAccentColor(section.accent);
    section.blocks.forEach((block, i) => {
      if (i > 0) box.addSeparatorComponents((line) => line.setDivider(true).setSpacing(SeparatorSpacingSize.Small));
      box.addTextDisplayComponents(new TextDisplayBuilder().setContent(block));
    });
    return box;
  });
  return [
    new TextDisplayBuilder().setContent(board.header),
    ...boxes,
    new TextDisplayBuilder().setContent(board.footer),
  ];
}

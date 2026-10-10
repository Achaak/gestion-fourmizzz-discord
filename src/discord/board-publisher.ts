import type { Client, Message, SendableChannels } from "discord.js";
import { BOARD_TITLE, renderBoard } from "../convoy/board.ts";
import type { ConvoyStore } from "../convoy/store.ts";

/**
 * Keeps one board message in the convoy channel and edits it after every change.
 * After a restart it takes back its last board message instead of posting a new one.
 */
export class BoardPublisher {
  private readonly client: Client<true>;
  private readonly channelId: string;
  private readonly store: ConvoyStore;
  private message: Message | null = null;
  /** Refreshes run one after the other so two quick commands cannot post two boards. */
  private queue: Promise<void> = Promise.resolve();

  constructor(client: Client<true>, channelId: string, store: ConvoyStore) {
    this.client = client;
    this.channelId = channelId;
    this.store = store;
  }

  refresh(): Promise<void> {
    this.queue = this.queue
      .then(() => this.publish())
      .catch((error: unknown) => {
        console.error("Board refresh failed", error);
      });
    return this.queue;
  }

  private async publish(): Promise<void> {
    const content = renderBoard(await this.store.list(), new Date());
    this.message ??= await this.findBoard();
    if (this.message) {
      this.message = await this.message.edit({ content, allowedMentions: { parse: [] } });
      return;
    }
    const channel = await this.channel();
    this.message = await channel.send({ content, allowedMentions: { parse: [] } });
  }

  private async findBoard(): Promise<Message | null> {
    const channel = await this.channel();
    const recent = await channel.messages.fetch({ limit: 50 });
    return (
      recent.find((message) => message.author.id === this.client.user.id && message.content.startsWith(BOARD_TITLE)) ??
      null
    );
  }

  private async channel(): Promise<SendableChannels> {
    const channel = await this.client.channels.fetch(this.channelId);
    if (!channel?.isSendable()) throw new Error(`Le salon ${this.channelId} n'accepte pas les messages du bot.`);
    return channel;
  }
}

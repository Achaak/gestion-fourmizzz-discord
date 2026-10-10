import type { Message } from "discord.js";
import { parseConvoyLines } from "../convoy/convoy-line.ts";
import { declarationSummary, declareConvoys } from "../convoy/declare.ts";
import { ConvoyError } from "../convoy/request.ts";
import { CONFIRMATION_LIFETIME_MS, type CommandContext, ERROR_LIFETIME_MS } from "./command.ts";

/**
 * A member posted in the convoy channel. Game convoy lines in the message are declared as with
 * `/livrer`; the message is then deleted whatever it held, so the channel keeps only the board (ADR 0003).
 */
export async function onConvoyChannelMessage(message: Message, { store, board }: CommandContext): Promise<void> {
  if (!board.isMemberPost(message)) return;
  try {
    const lines = parseConvoyLines(message.content, message.createdAt);
    if (lines.length === 0) return;
    const by = { discordId: message.author.id, name: message.member?.displayName ?? message.author.displayName };
    let results;
    try {
      results = await declareConvoys(store, by, lines, null);
    } finally {
      await board.refresh();
    }
    await board.notice(
      `${message.author.toString()} ${declarationSummary(lines.length, results)}`,
      "success",
      CONFIRMATION_LIFETIME_MS,
    );
  } catch (error) {
    if (!(error instanceof ConvoyError)) console.error("Convoy channel message failed", error);
    const content = `⚠️ ${error instanceof ConvoyError ? error.message : "Une erreur est survenue, réessayez plus tard."}`;
    await board
      .notice(`${message.author.toString()} ${content}`, "error", ERROR_LIFETIME_MS)
      .catch((noticeError: unknown) => {
        console.error("Could not answer in the convoy channel", noticeError);
      });
  } finally {
    await board.sweep(message);
  }
}

/** At startup: publishes the board, then handles what members posted while the bot was away. */
export async function startConvoyChannel(context: CommandContext): Promise<void> {
  try {
    for (const message of await context.board.start()) await onConvoyChannelMessage(message, context);
  } catch (error) {
    console.error("Convoy channel startup failed", error);
  }
}

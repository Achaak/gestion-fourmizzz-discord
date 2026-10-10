import {
  type ChatInputCommandInteraction,
  type Message,
  MessageFlags,
  type ModalSubmitInteraction,
  PermissionFlagsBits,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
  type RepliableInteraction,
} from "discord.js";
import type { Member } from "../convoy/request.ts";
import type { ConvoyStore } from "../convoy/store.ts";
import type { BoardPublisher } from "./board-publisher.ts";

export interface CommandContext {
  store: ConvoyStore;
  board: BoardPublisher;
}

export interface Command {
  data: { name: string; toJSON(): RESTPostAPIChatInputApplicationCommandsJSONBody };
  execute(interaction: ChatInputCommandInteraction<"cached">, context: CommandContext): Promise<void>;
  /** Handles the form the command opened; the form's custom id is the command name. */
  submit?(interaction: ModalSubmitInteraction<"cached">, context: CommandContext): Promise<void>;
}

/**
 * Convoy managers are members allowed to manage messages. Discord lets the server admins narrow
 * the managers' commands further in Paramètres du serveur → Intégrations.
 */
export const MANAGER_PERMISSION = PermissionFlagsBits.ManageMessages;

export function memberOf(interaction: RepliableInteraction<"cached">): Member {
  return { discordId: interaction.user.id, name: interaction.member.displayName };
}

export function isManager(interaction: ChatInputCommandInteraction<"cached">): boolean {
  return interaction.memberPermissions.has(MANAGER_PERMISSION);
}

/** Confirmations vanish quickly: the updated board already shows the change. */
export const CONFIRMATION_LIFETIME_MS = 15_000;
/** Errors stay longer so the player can read them and fix the command. */
export const ERROR_LIFETIME_MS = 60_000;

/**
 * Answers only to the player who typed the command; the board message is what everyone sees.
 * The answer is deleted after `lifetimeMs` so the player's view of the channel does not fill up.
 * Discord keeps the interaction token for 15 minutes, which bounds the lifetime.
 */
export async function replyPrivately(
  interaction: RepliableInteraction,
  content: string,
  lifetimeMs = CONFIRMATION_LIFETIME_MS,
): Promise<void> {
  const options = { content, flags: MessageFlags.Ephemeral } as const;
  let sent: Message | "@original" = "@original";
  if (interaction.replied || interaction.deferred) sent = await interaction.followUp(options);
  else await interaction.reply(options);
  // The player may already have dismissed the message: nothing left to delete.
  setTimeout(() => void interaction.deleteReply(sent).catch(() => undefined), lifetimeMs);
}

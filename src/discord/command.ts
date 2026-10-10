import {
  type ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
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
}

/**
 * Convoy managers are members allowed to manage messages. Discord lets the server admins narrow
 * the managers' commands further in Paramètres du serveur → Intégrations.
 */
export const MANAGER_PERMISSION = PermissionFlagsBits.ManageMessages;

export function memberOf(interaction: ChatInputCommandInteraction<"cached">): Member {
  return { discordId: interaction.user.id, name: interaction.member.displayName };
}

export function isManager(interaction: ChatInputCommandInteraction<"cached">): boolean {
  return interaction.memberPermissions.has(MANAGER_PERMISSION);
}

/** Answers only to the player who typed the command; the board message is what everyone sees. */
export async function replyPrivately(interaction: ChatInputCommandInteraction, content: string): Promise<void> {
  await interaction.reply({ content, flags: MessageFlags.Ephemeral });
}

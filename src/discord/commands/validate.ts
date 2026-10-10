import { SlashCommandBuilder } from "discord.js";
import { type Command, MANAGER_PERMISSION, memberOf, replyPrivately } from "../command.ts";

export const validateCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("valider")
    .setDescription("Valider une demande de convoi : elle passe en cours de livraison")
    .setDefaultMemberPermissions(MANAGER_PERMISSION)
    .addIntegerOption((option) =>
      option.setName("numero").setDescription("Numéro de la demande").setRequired(true).setMinValue(1),
    ),

  async execute(interaction, { store, board }) {
    const request = await store.validate(interaction.options.getInteger("numero", true), memberOf(interaction));
    await replyPrivately(interaction, `Demande n° ${request.id} validée : elle est ouverte aux livraisons.`);
    await board.refresh();
  },
};

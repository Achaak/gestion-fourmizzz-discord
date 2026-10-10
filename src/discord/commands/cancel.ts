import { SlashCommandBuilder } from "discord.js";
import { type Command, isManager, memberOf, replyPrivately } from "../command.ts";

export const cancelCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("annuler")
    .setDescription("Annuler une de vos demandes de convoi (un responsable peut annuler n'importe laquelle)")
    .addIntegerOption((option) =>
      option.setName("numero").setDescription("Numéro de la demande").setRequired(true).setMinValue(1),
    ),

  async execute(interaction, { store, board }) {
    const request = await store.cancel(
      interaction.options.getInteger("numero", true),
      memberOf(interaction),
      isManager(interaction),
    );
    await replyPrivately(interaction, `Demande n° ${request.id} annulée.`);
    await board.refresh();
  },
};

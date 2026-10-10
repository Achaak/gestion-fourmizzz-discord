import { SlashCommandBuilder } from "discord.js";
import { formatNumber, parseQuantity } from "../../convoy/quantity.ts";
import { remaining } from "../../convoy/request.ts";
import { type Command, memberOf, replyPrivately } from "../command.ts";

export const deliverCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("livrer")
    .setDescription("Déclarer un convoi envoyé pour une demande")
    .addIntegerOption((option) =>
      option.setName("numero").setDescription("Numéro de la demande").setRequired(true).setMinValue(1),
    )
    .addStringOption((option) => option.setName("nourriture").setDescription("Nourriture envoyée (ex. 500k)"))
    .addStringOption((option) => option.setName("materiaux").setDescription("Matériaux envoyés (ex. 500k)")),

  async execute(interaction, { store, board }) {
    const foodText = interaction.options.getString("nourriture");
    const materialsText = interaction.options.getString("materiaux");
    const food = foodText === null ? 0 : parseQuantity(foodText);
    const materials = materialsText === null ? 0 : parseQuantity(materialsText);
    if (food === null || materials === null) {
      await replyPrivately(
        interaction,
        "Quantité illisible : écrivez par exemple « 1 240 000 », « 272k » ou « 1,5m ».",
      );
      return;
    }
    const request = await store.deliver(interaction.options.getInteger("numero", true), memberOf(interaction), {
      food,
      materials,
    });
    const left = remaining(request);
    await replyPrivately(
      interaction,
      request.status === "done"
        ? `Merci ! La demande n° ${request.id} est entièrement livrée.`
        : `Merci ! Reste pour la demande n° ${request.id} : ${formatNumber(left.food)} nourriture, ${formatNumber(left.materials)} matériaux.`,
    );
    await board.refresh();
  },
};

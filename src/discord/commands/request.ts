import { SlashCommandBuilder } from "discord.js";
import { parseDueDate } from "../../convoy/due-date.ts";
import { parseQuantity } from "../../convoy/quantity.ts";
import { ConvoyError } from "../../convoy/request.ts";
import { type Command, memberOf, replyPrivately } from "../command.ts";

export const requestCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("demande")
    .setDescription("Demander un convoi pour une construction ou une recherche")
    .addStringOption((option) =>
      option.setName("construction").setDescription("Ex. : Couveuse, Entrepôt de matériaux").setRequired(true),
    )
    .addIntegerOption((option) =>
      option.setName("niveau").setDescription("Niveau visé").setRequired(true).setMinValue(1),
    )
    .addStringOption((option) =>
      option.setName("nourriture").setDescription("Nourriture à recevoir (ex. 1 240 000, 272k, 1,5m)"),
    )
    .addStringOption((option) =>
      option.setName("materiaux").setDescription("Matériaux à recevoir (ex. 1 240 000, 272k, 1,5m)"),
    )
    .addStringOption((option) => option.setName("pour").setDescription("Date souhaitée (JJ/MM)")),

  async execute(interaction, { store, board }) {
    const food = readQuantity(interaction.options.getString("nourriture"));
    const materials = readQuantity(interaction.options.getString("materiaux"));
    if (food === null || materials === null) {
      throw new ConvoyError("Quantité illisible : écrivez par exemple « 1 240 000 », « 272k » ou « 1,5m ».");
    }
    const dueText = interaction.options.getString("pour");
    const dueDate = dueText === null ? null : parseDueDate(dueText, new Date());
    if (dueText !== null && dueDate === null) {
      throw new ConvoyError(`Date illisible : « ${dueText} ». Écrivez-la au format JJ/MM, par exemple 12/10.`);
    }
    const request = await store.create({
      requester: memberOf(interaction),
      building: interaction.options.getString("construction", true).trim(),
      level: interaction.options.getInteger("niveau", true),
      amounts: { food, materials },
      dueDate,
    });
    await replyPrivately(
      interaction,
      `Demande n° ${request.id} enregistrée (${request.building} ${request.level}). Elle attend la validation d'un responsable.`,
    );
    await board.refresh();
  },
};

/** An empty option means 0; unreadable text gives null. */
function readQuantity(text: string | null): number | null {
  return text === null ? 0 : parseQuantity(text);
}

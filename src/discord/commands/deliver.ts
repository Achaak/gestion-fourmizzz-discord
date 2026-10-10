import { LabelBuilder, ModalBuilder, SlashCommandBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { parseConvoyLines } from "../../convoy/convoy-line.ts";
import { declarationSummary, declareConvoys } from "../../convoy/declare.ts";
import { ConvoyError } from "../../convoy/request.ts";
import { type Command, memberOf, replyPrivately } from "../command.ts";

const NAME = "livrer";
const CONVOYS_FIELD = "convois";
const NUMBER_FIELD = "numero";

/**
 * Opens a form where the player pastes the game's convoy lines, several at once if they like.
 * A slash command option would lose the line breaks; a form keeps them.
 */
export const deliverCommand: Command = {
  data: new SlashCommandBuilder()
    .setName(NAME)
    .setDescription("Déclarer des convois envoyés en collant les lignes du jeu"),

  async execute(interaction) {
    const modal = new ModalBuilder()
      .setCustomId(NAME)
      .setTitle("Déclarer des convois")
      .addLabelComponents(
        new LabelBuilder()
          .setLabel("Convois")
          .setDescription("Collez les lignes du jeu, une par convoi.")
          .setTextInputComponent(
            new TextInputBuilder()
              .setCustomId(CONVOYS_FIELD)
              .setStyle(TextInputStyle.Paragraph)
              .setPlaceholder("Vous allez livrer 0 nourritures et 30 000 materiaux à … dans 6H 21m 17s - Retour le …")
              .setRequired(true),
          ),
        new LabelBuilder()
          .setLabel("Numéro de la demande (facultatif)")
          .setDescription("Seulement si le bot ne trouve pas la demande avec le pseudo du destinataire.")
          .setTextInputComponent(
            new TextInputBuilder().setCustomId(NUMBER_FIELD).setStyle(TextInputStyle.Short).setRequired(false),
          ),
      );
    await interaction.showModal(modal);
  },

  async submit(interaction, { store, board }) {
    const lines = parseConvoyLines(interaction.fields.getTextInputValue(CONVOYS_FIELD), interaction.createdAt);
    if (lines.length === 0) {
      throw new ConvoyError("Aucun convoi reconnu : collez les lignes du jeu « Vous allez livrer … à … dans … ».");
    }
    const forcedId = readNumber(interaction.fields.getTextInputValue(NUMBER_FIELD));

    let declaration;
    try {
      declaration = await declareConvoys(store, memberOf(interaction), lines, forcedId, interaction.createdAt);
    } finally {
      await board.refresh();
    }
    await replyPrivately(interaction, declarationSummary(declaration));
  },
};

function readNumber(text: string): number | null {
  if (text.trim() === "") return null;
  const id = Number(text.trim().replace(/^n°\s*/i, ""));
  if (!Number.isInteger(id) || id < 1) throw new ConvoyError(`Numéro de demande illisible : « ${text} ».`);
  return id;
}

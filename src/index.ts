import { Client, Events, GatewayIntentBits, type Interaction, MessageFlags } from "discord.js";
import { loadConfig } from "./config.ts";
import { ConvoyError } from "./convoy/request.ts";
import { MemoryConvoyStore } from "./convoy/store.ts";
import { BoardPublisher } from "./discord/board-publisher.ts";
import type { CommandContext } from "./discord/command.ts";
import { commands } from "./discord/commands/index.ts";

const config = loadConfig();
const byName = new Map(commands.map((command) => [command.data.name, command]));
const store = new MemoryConvoyStore();
// Slash commands need no message content: the Guilds intent is enough.
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, (ready) => {
  console.log(`Connecté en tant que ${ready.user.tag}`);
  const context: CommandContext = { store, board: new BoardPublisher(ready, config.CONVOY_CHANNEL_ID, store) };
  void context.board.refresh();
  ready.on(Events.InteractionCreate, (interaction) => void handle(interaction, context));
});

async function handle(interaction: Interaction, context: CommandContext): Promise<void> {
  if (!interaction.isChatInputCommand()) return;
  const command = byName.get(interaction.commandName);
  if (!command) return;
  try {
    if (!interaction.inCachedGuild()) throw new ConvoyError("Utilisez cette commande sur le serveur de l'alliance.");
    await command.execute(interaction, context);
  } catch (error) {
    if (!(error instanceof ConvoyError)) console.error(`/${interaction.commandName} failed`, error);
    const content = error instanceof ConvoyError ? error.message : "Une erreur est survenue, réessayez plus tard.";
    const reply = { content, flags: MessageFlags.Ephemeral } as const;
    try {
      if (interaction.replied || interaction.deferred) await interaction.followUp(reply);
      else await interaction.reply(reply);
    } catch (replyError) {
      console.error("Could not answer the interaction", replyError);
    }
  }
}

await client.login(config.DISCORD_TOKEN);

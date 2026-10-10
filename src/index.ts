import { Client, Events, GatewayIntentBits, type Interaction } from "discord.js";
import { loadConfig } from "./config.ts";
import { ConvoyError } from "./convoy/request.ts";
import { MemoryConvoyStore } from "./convoy/store.ts";
import { BoardPublisher } from "./discord/board-publisher.ts";
import { type CommandContext, ERROR_LIFETIME_MS, replyPrivately } from "./discord/command.ts";
import { commands } from "./discord/commands/index.ts";
import { onConvoyChannelMessage, startConvoyChannel } from "./discord/convoy-channel.ts";

const config = loadConfig();
const byName = new Map(commands.map((command) => [command.data.name, command]));
const store = new MemoryConvoyStore();
// GuildMessages and MessageContent let the bot read what is posted in the convoy channel, declare the
// convoy lines it holds and delete it (docs/adr/0003). MessageContent must be enabled in the Developer Portal.
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

client.once(Events.ClientReady, (ready) => {
  console.log(`Connecté en tant que ${ready.user.tag}`);
  const context: CommandContext = { store, board: new BoardPublisher(ready, config.CONVOY_CHANNEL_ID, store) };
  void startConvoyChannel(context);
  ready.on(Events.InteractionCreate, (interaction) => void handle(interaction, context));
  ready.on(Events.MessageCreate, (message) => void onConvoyChannelMessage(message, context));
});

async function handle(interaction: Interaction, context: CommandContext): Promise<void> {
  if (!interaction.isChatInputCommand() && !interaction.isModalSubmit()) return;
  const name = interaction.isChatInputCommand() ? interaction.commandName : interaction.customId;
  const command = byName.get(name);
  if (!command) return;
  try {
    if (!interaction.inCachedGuild()) throw new ConvoyError("Utilisez cette commande sur le serveur de l'alliance.");
    if (interaction.isChatInputCommand()) await command.execute(interaction, context);
    else await command.submit?.(interaction, context);
  } catch (error) {
    if (!(error instanceof ConvoyError)) console.error(`/${name} failed`, error);
    const content = error instanceof ConvoyError ? error.message : "Une erreur est survenue, réessayez plus tard.";
    try {
      await replyPrivately(interaction, content, ERROR_LIFETIME_MS);
    } catch (replyError) {
      console.error("Could not answer the interaction", replyError);
    }
  }
}

try {
  await client.login(config.DISCORD_TOKEN);
} catch (error) {
  if (error instanceof Error && error.message === "Used disallowed intents") {
    console.error(
      "Discord refuse l'intent Message Content : activez « Message Content Intent » dans le Developer Portal " +
        "(Applications → le bot → Bot → Privileged Gateway Intents), puis relancez le bot.",
    );
    process.exit(1);
  }
  throw error;
}

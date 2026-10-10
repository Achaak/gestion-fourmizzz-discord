// Registers the slash commands on the alliance server. Guild commands show up immediately.
import { REST, Routes } from "discord.js";
import { loadConfig } from "./config.ts";
import { commands } from "./discord/commands/index.ts";

const config = loadConfig();
const rest = new REST().setToken(config.DISCORD_TOKEN);
await rest.put(Routes.applicationGuildCommands(config.DISCORD_CLIENT_ID, config.DISCORD_GUILD_ID), {
  body: commands.map((command) => command.data.toJSON()),
});
console.log(`${commands.length} commandes enregistrées : ${commands.map((c) => `/${c.data.name}`).join(", ")}`);

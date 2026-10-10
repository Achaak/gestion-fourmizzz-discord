import { z } from "zod";

const snowflake = z.string().regex(/^\d{17,20}$/, "identifiant Discord attendu");

const schema = z.object({
  DISCORD_TOKEN: z.string().min(1),
  DISCORD_CLIENT_ID: snowflake,
  DISCORD_GUILD_ID: snowflake,
  CONVOY_CHANNEL_ID: snowflake,
});

export type Config = z.infer<typeof schema>;

/** Reads the environment (`.env`, see `.env.example`) and stops with a readable message when something is missing. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const result = schema.safeParse(env);
  if (!result.success) {
    const problems = result.error.issues.map((issue) => `  ${issue.path.join(".")} : ${issue.message}`);
    throw new Error(`Configuration invalide (voir .env.example) :\n${problems.join("\n")}`);
  }
  return result.data;
}

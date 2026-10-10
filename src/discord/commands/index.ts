import type { Command } from "../command.ts";
import { cancelCommand } from "./cancel.ts";
import { deliverCommand } from "./deliver.ts";
import { requestCommand } from "./request.ts";
import { validateCommand } from "./validate.ts";

/** Every slash command of the bot. Run `pnpm deploy-commands` after adding or changing one. */
export const commands: Command[] = [requestCommand, validateCommand, deliverCommand, cancelCommand];

import { TimersManager } from "./TimersManager.js";
import { PlainTextTimersStore } from "../TimersStore/PlainTextTimersStore.js";
import type { TimersStore } from "src/TimersStore/TimersStore.js";

/**
 * PlainTextTimersManager
 * @description
 * Manages timers stored in a PlainText file.
 * (This is a abstract class)
 *
 * - Timers are persisted in a file
 * - Expired timers are detected by polling
 */
export class PlainTextTimersManager extends TimersManager<"PlainText"> {
	protected override TimersStore: PlainTextTimersStore | null = null;

	protected override getDefaultFilename(): string {
		return ".timers";
	}

	protected async createTimersStore(): Promise<TimersStore<"PlainText">> {
		return await PlainTextTimersStore.create(this.disableCache, this.timerfiledir);
	}
}

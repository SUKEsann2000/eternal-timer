import { TimersManager } from "./TimersManager.js";
import { PlainTextTimersStore } from "../TimersStore/PlainTextTimersStore.js";

/**
 * PlainTextTimersManager
 * @description
 * Manages timers stored in a PlainText file.
 * (This is a abstract class)
 *
 * - Timers are persisted in a file
 * - Expired timers are detected by polling
 */
export class PlainTextTimersManager extends TimersManager<"PlainText", object> {
	protected override TimersStore: PlainTextTimersStore | null = null;

	protected override getDefaultFilename(): string {
		return ".timers";
	}

	protected async createTimersStore(): Promise<PlainTextTimersStore> {
		return new PlainTextTimersStore(this.timerfiledir);
	}
}

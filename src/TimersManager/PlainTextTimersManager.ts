import { v4 as uuidv4 } from "uuid";

import { TimersManager } from "./TimersManager.js";
import { PlainTextTimersStore } from "../TimersStore/PlainTextTimersStore.js";
import type { Timer, CreateTimerOptions } from "../types.js";

/**
 * PlainTextTimersManager
 * @description
 * Manages timers stored in a PlainText file.
 * (This is a abstract class)
 *
 * - Timers are persisted in a file
 * - Expired timers are detected by polling
 */
export class PlainTextTimersManager extends TimersManager<"PlainText", {}> {
	protected override TimersStore: PlainTextTimersStore | null = null;

	/**
	 * createTimer
	 * @description Creates a new timer.
	 * @param length Timer duration in milliseconds
	 * @returns Promise that resolves to the timer ID (UUID)
	 * @throws If length is invalid(e.g. length < 0) or file operation fails
	 * @example
	 * const manager = new TimersManager();
	 * const newTimer = await manager.createTimer(5000);
	 * // newTimer will be id of the timer
	 */
	public override async createTimer(options: CreateTimerOptions<"PlainText", {}>): Promise<string> {
		return this.runExclusive(async () => {
			this.TimersStore ??= await this.createTimersStore();

			let length: number = options;
			if (length < 0) throw new Error(`Invalid length: ${length}`);

			length = Math.trunc(length);

			const id = uuidv4();
			const now = Date.now();
			const stopTime = now + Math.max(1, length);

			let newTimerData: Timer<"PlainText", {}>;


			newTimerData = {
				id,
				start: now,
				stop: stopTime
			}

			await this.TimersStore.appendTimer(newTimerData);
			return id;
		});
	}

	protected override getDefaultFilename(): string {
		return ".timers";
	}

	protected async createTimersStore(): Promise<PlainTextTimersStore> {
		return new PlainTextTimersStore(this.timerfiledir);
	}
}

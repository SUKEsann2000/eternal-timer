import { v4 as uuidv4 } from "uuid";

import { TimersManager } from "./TimersManager.js";
import { JSONLTimersStore } from "../TimersStore/JSONLTimersStore.js";
import type { CreateTimerOptions, Timer } from "../types.js";

/**
 * JSONLTimersManager
 * @description
 * Manages timers stored in a  JSONL file.
 * (This is a abstract class)
 *
 * - Timers are persisted in a file
 * - Expired timers are detected by polling
 */
export class JSONLTimersManager<Extra extends object = {}> extends TimersManager<"JSONL", Extra> {
	protected override TimersStore: JSONLTimersStore<Extra> | null = null;

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
	public override async createTimer(options: CreateTimerOptions<"JSONL", Extra>): Promise<string> {
		return this.runExclusive(async () => {
			this.TimersStore ??= await this.createTimersStore();

			let length: number = typeof options === "object" ? options.length : options;
			if (length < 0) throw new Error(`Invalid length: ${length}`);

			length = Math.trunc(length);

			const id = uuidv4();
			const now = Date.now();
			const stopTime = now + Math.max(1, length);

			let newTimerData: Timer<"JSONL", Extra>;

			newTimerData = {
				id,
				start: now,
				stop: stopTime,
				...(typeof options === "object" && options.extra !== undefined ? { extra: options.extra } : { extra: {} })
			};

			await this.TimersStore.appendTimer(newTimerData);
			return id;
		});
	}

	protected override getDefaultFilename(): string {
		return ".timers.jsonl";
	}

	protected override async createTimersStore(): Promise<JSONLTimersStore<Extra>> {
		return new JSONLTimersStore(this.timerfiledir);
	}

	public async changeExtra(
		id: string,
		newExtra: Extra
	) {
		return this.runExclusive(async () => {
			this.TimersStore ??= await this.createTimersStore();
			try {
				const timers = await this.TimersStore.loadTimers();

				const index = timers?.findIndex(t => t.id === id);
				if (index === -1) {
					throw new Error(`Timer with id ${id} not found`);
				}

				timers[index]!.extra = newExtra;
				await this.TimersStore.saveTimers(timers);
			} catch (e) {
				throw new Error(`Error when changing extra`, { cause: e });
			}
		});
	}
}
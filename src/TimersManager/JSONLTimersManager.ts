import { v4 as uuidv4 } from "uuid";

import type { Timer, CreateTimerOptions } from "../types.js";
import { TimersManager } from "./TimersManager.js";
import { Log } from "../Log.js";
import { JSONLTimersStore } from "../TimersStore/JSONLTimersStore.js";

/**
 * JSONLTimersManager
 * @description
 * Manages timers stored in a  JSONL file.
 * (This is a abstract class)
 *
 * - Timers are persisted in a file
 * - Expired timers are detected by polling
 */
export class JSONLTimersManager extends TimersManager<"JSONL"> {
	protected override TimersStore: JSONLTimersStore | null = null;

	protected override getDefaultFilename(): string {
		return ".timers.jsonl";
	}

	/**
     * createTimer
     * @description Creates a new timer.
     * @param length Timer duration in milliseconds
	 * @param title(string, optional) Title of the timer(only for JSONLTimersManager)
	 * @param description(string, optional) Description of the timer(only for JSONLTimersManager)
     * @returns Promise that resolves to the timer ID (UUID)
     * @throws If length is invalid(e.g. length < 0) or file operation fails
     * @example
     * const manager = new JSONLTimersManager();
     * const newTimer = await manager.createTimer(5000);
     * // newTimer will be id of the timer
     */
	public override async createTimer(options: CreateTimerOptions<"JSONL">): Promise<string> {
		try {
			this.TimersStore = this.TimersStore !== null ? this.TimersStore : await JSONLTimersStore.create(this.disableCache, this.timerfiledir);
			let length = typeof options === "object" ? options.length : options;
			if (length < 0) {
				throw new Error(`Invailed length: ${length}`);
			}

			length = Math.trunc(length);

			// uuid, start, end
			const id = uuidv4();
			const now = Date.now();
			const newTimerData: Timer<"JSONL"> = {
				id,
				start: now,
				stop: (now + length),
				...(typeof options === "object" && options.title !== undefined && { title: options.title }),
				...(typeof options === "object" && options.description !== undefined && { description: options.description }),
			};
			await this.TimersStore.appendTimer(newTimerData);
			return id;
		} catch (e) {
			throw new Error(`Error when creating timer: ${e}`);
		}
	}

	/**
     * removeTimer
     * @description Removes a timer by ID.
     * @param id ID of the timer to remove
     * @returns void
     * @throws If file operation fails
     * @example
     * await manager.removeTimer(id);
     */
	public override async removeTimer(id: string): Promise<void> {
		try {
			this.TimersStore = this.TimersStore !== null ? this.TimersStore : await JSONLTimersStore.create(this.disableCache, this.timerfiledir);
			const timers = await this.TimersStore.loadTimers();
			
			const index = timers.findIndex(t => t.id === id);
			if (index === -1) {
				throw new Error(`Timer with id ${id} not found`);
			}

			timers.splice(index, 1);
			await this.TimersStore.saveTimers(timers);
			return;
		} catch (e) {
			throw new Error(`Error when removing timer: ${e}`);
		}
	}

	/**
     * @description Starts monitoring expired timers asynchronously and returns immediately. The callback is invoked asynchronously when a timer expires.
     * The callback is awaited before continuing.
     * @param callback Function invoked when an expired timer is detected (called asynchronously)
     * @param interval (number, optional): Check interval in milliseconds (default: 200ms)
     * @throws If file operation fails
	 * @returns (NodeJS.Timeout) intervalId interval id of checkTimers
     * @example
     * const interval = manager.checkTimers((timer) => {
     *     console.log(`A timer was stopped: ${timer.id}`);
     * });
     */
	public override async checkTimers(callback: (timer: Timer<"JSONL">) => Promise<void>, interval: number = 200): Promise<NodeJS.Timeout> {
		this.TimersStore = this.TimersStore !== null ? this.TimersStore : await JSONLTimersStore.create(this.disableCache, this.timerfiledir);

		let timeout: NodeJS.Timeout | null = null;
		const loop = async () => {
			if (this.checkLock) return;
			this.checkLock = true;

			try {
				const now = Date.now();
				const expired: Timer<"JSONL">[] = await this.TimersStore!.loadTimers().then(timers => timers.filter(timer => timer.stop <= now));

				await Promise.all(expired.map(async timerData => {
					try {
						await this.removeTimer(timerData.id);
						await callback(timerData);
					} catch (e) {
						await Log.ensureLogger();
						Log.loggerInstance?.error(`Error in callback of checkTimers: ${e}`);
					}
				}));
			} catch (e) {
				await Log.ensureLogger();
				Log.loggerInstance?.error(`Error when checking timer: ${e}`);
			} finally {
				this.checkLock = false;
				timeout = setTimeout(loop, interval);
				return;
			}
		}

		timeout = setTimeout(loop, interval);
		return timeout;
	}

	/**
     * showTimers
     * @description Retrieves all active timers.
     * @returns Array of `Timer` objects
     * @throws If file operation fails
     * @example
     * const timers = await manager.showTimers();
     * console.log(JSON.stringify(timers))
     */
	public override async showTimers(): Promise<Timer<"JSONL">[]> {
		try {
			this.TimersStore = this.TimersStore !== null ? this.TimersStore : await JSONLTimersStore.create(this.disableCache, this.timerfiledir);
			const timersData = await this.TimersStore.loadTimers();
			return timersData;
		} catch (e) {
			throw new Error(`Error when showing timers: ${e}`);
		}
	}

	/**
	 * adjustRemainingTime
	 * @description Adjusts the remaining time of a timer.
	 * @param id ID of the timer to modify
	 * @param delay Delay in milliseconds to add/subtract from the remaining time
	 * @returns Promise resolving when the operation is complete
	 * @throws If file operation fails
	*/
	public override async adjustRemainingTime(id: string, delay: number): Promise<void> {
		try {
			this.TimersStore = this.TimersStore !== null ? this.TimersStore : await JSONLTimersStore.create(this.disableCache, this.timerfiledir);
			const timers = await this.TimersStore.loadTimers();

			const index = timers.findIndex(t => t.id === id);
			if (index === -1) {
				throw new Error(`Timer with id ${id} not found`);
			}

			const timer = timers[index]!;
			const remaining = timer.stop - Date.now();
			const newRemaining = remaining + delay;

			if (newRemaining < 0) {
				throw new Error(`Resulting remaining time cannot be negative`);
			}

			timer.stop = Date.now() + newRemaining;
			timers[index] = timer;
			await this.TimersStore.saveTimers(timers);
			return;
		} catch (e) {
			throw new Error(`Error when adjusting remaining time: ${e}`);
		}
	}
}
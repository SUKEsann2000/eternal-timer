import path from "path";
import fs from "fs";

import searchRoot from "../searchRoot.js";
import type { CreateTimerOptions, StorageType, Timer } from "../types.js";
import { TimersStore } from "../TimersStore/TimersStore.js";
import { Log } from "../Log.js";

/**
 * TimersManager
 * @description
 * Manages timers stored in a file.
 * (This is a abstract class)
 *
 * - Timers are persisted in a file
 * - Expired timers are detected by polling
 */
export abstract class TimersManager<T extends StorageType, Extra extends object> {
	protected readonly timerfiledir: string;
	private checkLock: boolean = false;

	protected TimersStore: TimersStore<T, Extra> | null = null;

	private queue: Promise<void> = Promise.resolve();
	protected runExclusive<T>(fn: () => Promise<T>) {
		const p = this.queue.then(fn);
		this.queue = p.then(() => {}, () => {});
		return p;
	}

	protected abstract getDefaultFilename(): string;
	protected abstract createTimersStore(): Promise<TimersStore<T, Extra>>;

	/**
      * constructor
      * @description Initializes the TimersManager instance. If the timer file does not exist, an empty file is created.
      * @param options (TimersManagerOptions | string, optional) Configuration object or timer file path. If a string is provided, it is treated as the timer file path. If an object is provided, `timerfiledir` can be specified.
      * @throws If file access or creation fails
      * @example
      * const manager = new TimersManager(); // Uses default timer file path
      * const manager = new TimersManager("/path/to/timers.txt"); // Uses specified timer file path
      */
	constructor(
		options?: string,
	) {
		const rootDir = searchRoot();
		this.timerfiledir = path.resolve(rootDir, options ?? this.getDefaultFilename());
		if (!this.timerfiledir.startsWith(rootDir)) {
			throw new Error(`Timer file path must be within the project directory`);
		}
		try {
			fs.accessSync(this.timerfiledir);
		} catch {
			fs.writeFileSync(this.timerfiledir, "");
		}
	}

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
	public abstract createTimer(options: CreateTimerOptions<T, Extra>): Promise<string>;

	/**
     * removeTimer
     * @description Removes a timer by ID.
     * @param id ID of the timer to remove
     * @returns void
     * @throws If file operation fails
     * @example
     * await manager.removeTimer(id);
     */
	public async removeTimer(id: string): Promise<void> {
		return this.runExclusive(async () => {
			this.TimersStore ??= await this.createTimersStore();
			const timers = await this.TimersStore.loadTimers();

			const index = timers.findIndex(t => t.id === id);
			if (index === -1) {
				throw new Error(`Timer with id ${id} not found`);
			}

			timers.splice(index, 1);
			await this.TimersStore.saveTimers(timers);
			return;
		});
	}

	/**
	 * checkTimers
 	 * @description Starts monitoring timers at the specified interval.
     * When a timer expires, the provided `callback` is invoked with the timer.
	 * The callback is awaited before the next processing cycle continues.
     * @param callback Function invoked when an expired timer is detected (called asynchronously)
     * @param interval (number, optional): Check interval in milliseconds (default: 200ms)
     * @throws If file operation fails
	 * @returns (Promise<NodeJS.Timeout>) intervalId interval id of checkTimers
     * @example
     * const interval = await manager.checkTimers((timer) => {
     *     console.log(`A timer was stopped: ${timer.id}`);
     * });
     */
	public async checkTimers(callback: (timer: Timer<T, Extra>) => void | Promise<void>, interval: number = 200): Promise<NodeJS.Timeout> {

		this.TimersStore ??= await this.createTimersStore();

		const loop = async () => {
			if (this.checkLock) {
				return;
			}

			this.checkLock = true;

			try {
				const expiredTimers = await this.runExclusive(async () => {
					const allTimers = await this.TimersStore!.loadTimers();
					const now = Date.now();

					const expired: Timer<T, Extra>[] = [];
					const active: Timer<T, Extra>[] = [];

					for (const timer of allTimers) {
						if (timer.stop <= now) {
							expired.push(timer);
						} else {
							active.push(timer);
						}
					}

					if (expired.length > 0) {
						await this.TimersStore!.saveTimers(active);
					}

					return expired;
				});

				for (const timerData of expiredTimers) {
					try {
						await callback(timerData);
					} catch (e) {
						await Log.ensureLogger();
						Log.loggerInstance?.error(
							`Error in callback of checkTimers: ${e}`,
						);
					}
				}

			} catch (e) {
				await Log.ensureLogger();
				Log.loggerInstance?.error(`Error when checking timer: ${e}`);
			} finally {
				this.checkLock = false;
			}
		};
		return setInterval(loop, interval);
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
	public async showTimers(): Promise<Timer<T, Extra>[]> {
		return this.runExclusive(async () => {
			this.TimersStore ??= await this.createTimersStore();
			const timersData = await this.TimersStore.loadTimers();
			return timersData;
		});
	}

	/**
      * adjustRemainingTime
      * @description Adjusts the remaining time of a timer.
      * @param id ID of the timer to modify
      * @param delay Delay in milliseconds to add/subtract from the remaining time
      * @returns Promise resolving when the operation is complete
      * @throws If file operation fails
      */
	public async adjustRemainingTime(id: string, delay: number): Promise<void> {
		return this.runExclusive(async () => {
			this.TimersStore ??= await this.createTimersStore();
			const timers = await this.TimersStore.loadTimers();

			const index = timers.findIndex(t => t.id === id);
			if (index === -1) {
				throw new Error(`Timer with id ${id} not found`);
			}

			const now = Date.now();

			const timer = timers[index]!;
			const remaining = Math.max(0, timer.stop - now);
			const newRemaining = Math.max(0, remaining + delay);

			timer.stop = now + newRemaining;
			timers[index] = timer;
			await this.TimersStore.saveTimers(timers);
			return;
		});
	 }
}

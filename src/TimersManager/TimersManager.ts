import { v4 as uuidv4 } from "uuid";

import type { CreateTimerOptions, StorageType, Timer } from "../types.js";
import { TimersStore } from "../TimersStore/TimersStore.js";
import { EventEmitter } from "../EventEmitter.js";
import { throwMessage } from "../throwMessage.js";

/**
 * TimersManager
 * @description
 * Manages timers stored in a file.
 * (This is a abstract class)
 *
 * - Timers are persisted in a file
 * - Expired timers are detected by polling
 */
export abstract class TimersManager<T extends StorageType, Extra extends object> extends EventEmitter<T, Extra> {
	protected readonly timerfiledir: string;

	protected abstract TimersStore: TimersStore<T, Extra>;

	protected checkLock: boolean = false;

	protected abstract getDefaultFilename(): string;
	protected abstract createTimersStore(): TimersStore<T, Extra>;
	protected abstract type: T;

	/**
	 * constructor
	 * @param {string | undefined} timerfile optional timer file path. If not provided, the default path will be used.
	 * @description Initializes the TimersManager instance. If the timer file does not exist, an empty file is created.
	 * @throws If file access or creation fails
	 * @example
	 * const manager = new TimersManager(); // Uses default timer file path
	 * const manager = new TimersManager("/path/to/timers"); // Uses specified timer file path  
	 */
	protected constructor(timerfile?: string) {
		super();
		this.timerfiledir = timerfile ?? this.getDefaultFilename();
	}

	/**
     * createTimer
     * @description Creates a new timer.
     * @param {CreateTimerOptions<T, Extra>} options Timer duration in milliseconds for PlainText or an object with length and extra for JSONL.
     * @returns Promise that resolves to the timer ID (UUID)
     * @throws If length is invalid (e.g. length < 0) or file operation fails
     * @example
     * // For PlainTextTimersManager
     * const manager = new PlainTextTimersManager();
     * const newTimerId = await manager.createTimer(5000); // Create a 5-second timer
     *
     * // For JSONLTimersManager
     * const jsonlManager = new JSONLTimersManager<{ title: string }>();
     * const jsonlTimerId = await jsonlManager.createTimer({ length: 10000, extra: { title: "My JSONL Timer" } }); // Create a 10-second timer with extra data
     */
	public async createTimer(options: CreateTimerOptions<T, Extra>): Promise<string> {
		this.TimersStore ??= await this.createTimersStore();

		if (this.type === "JSONL" && typeof options === "number") {
			throw new Error(throwMessage.NoExtra);
		}

		let length: number = typeof options === "object" ? options.length : options;
		if (length < 0 || !Number.isFinite(length)) throw new Error(throwMessage.InvalidLength(length));

		length = Math.trunc(length);

		const id = uuidv4();
		const now = Date.now();
		const stopTime = now + Math.max(1, length);

		const newTimerData: Timer<T, Extra> = {
			id,
			start: now,
			stop: stopTime,
			...(options && typeof options === "object" && options.extra !== undefined
				? { extra: options.extra }
				: {}),
		} as Timer<T, Extra>;

		await this.TimersStore.appendTimer(newTimerData);
		return id;
	}

	/**
     * removeTimer
     * @description Removes a timer by ID.
     * @param {string} id ID of the timer to remove
     * @returns Promise resolving when the operation is complete
     * @throws If file operation fails
     * @example
     * await manager.removeTimer(id);
     */
	public async removeTimer(id: string): Promise<void> {
		this.TimersStore ??= await this.createTimersStore();
		const timers = await this.TimersStore.loadTimers();

		const index = timers.findIndex(t => t.id === id);
		if (index === -1 || timers[index] === undefined) {
			throw new Error(throwMessage.NotFound(id));
		}

		timers.splice(index, 1);
		await this.TimersStore.saveTimers(timers);
		return;
	}

	/**
	 * checkStart
	 * @description Starts the timer checking loop. This method should be called once after creating an instance of TimersManager to detect expired timers.
	 * @param {number} [interval=200] Polling interval in milliseconds (default: 200ms)
	 * @returns Promise<void> that resolves when the loop has been started
	 * @throws If file operation fails during checking
	 * @example
	 * const manager = new TimersManager();
	 * await manager.checkStart(1000); // Check for expired timers every 1 second
	 */
	public async checkStart(
		interval: number = 200,
	): Promise<void> {

		if (this.TimersStore.interval) {
			throw new Error(throwMessage.AlreadyRunning);
		}

		const loop = async () => {
			if (!this.TimersStore.interval) return;
			if (this.checkLock) return;

			this.checkLock = true;

			try {
				const allTimers = await this.TimersStore!.loadTimers();
				const now = Date.now();

				const expired: Timer<T, Extra>[] = [];
				const active: Timer<T, Extra>[] = [];

				for (const timer of allTimers) {
					if (timer.stop <= now) expired.push(timer);
					else active.push(timer);
				}

				if (expired.length > 0) {
					await this.TimersStore!.saveTimers(active);
				}

				const expiredTimers = expired;

				for (const timer of expiredTimers) {
					try {
						await this.emit("expired", timer);
					} catch (e) {
						await this.emit("errored", e instanceof Error ? e : new Error(String(e)));
					}
				}

			} catch (e) {
				await this.emit("errored", e instanceof Error ? e : new Error(String(e)));
				this.TimersStore.interval = null;
			} finally {
				this.checkLock = false;
				if (this.TimersStore.interval) {
					this.TimersStore.interval.refresh();
				}
			}
		};

		this.emit("started", void 0);
		this.TimersStore.interval = setInterval(loop, interval);
	}

	/**
	 * checkStop
	 * @description Stops the timer checking loop.
	 * @returns Promise resolving when the loop has been stopped
	 * @example
	 * const manager = new TimersManager();
	 * await manager.checkStart(1000);
	 * // ... later, to stop checking:
	 * await manager.checkStop();
	 */
	public async checkStop(): Promise<void> {
		this.TimersStore.interval = null;
		if (this.TimersStore.interval) {
			clearInterval(this.TimersStore.interval);
			this.TimersStore.interval = null;
		}
		this.emit("stopped", void 0);
	}

	/**
	 * isBusy
	 * @description Indicates whether the TimersManager is currently performing a file operation (e.g. loading or saving timers). This can be used to avoid starting multiple operations simultaneously.
	 * @returns `true` if a file operation is in progress, otherwise `false`
	 * @example
	 * if (!manager.isBusy) {
	 *   await manager.createTimer(5000);
	 * }
	 */
	public get isBusy(): boolean {
		return this.checkLock;
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
		this.TimersStore ??= await this.createTimersStore();
		const timersData = await this.TimersStore.loadTimers();
		return timersData;
	}

	/**
      * adjustRemainingTime
      * @description Adjusts the remaining time of a timer.
      * @param {string} id ID of the timer to modify
      * @param {number} delay Delay in milliseconds to add/subtract from the remaining time
      * @returns Promise resolving when the operation is complete
      * @throws If file operation fails
      */
	public async adjustRemainingTime(id: string, delay: number): Promise<void> {
		if (typeof delay !== "number" || !Number.isFinite(delay)) {
			throw new Error(throwMessage.InvalidAdjustment(delay));
		}

		this.TimersStore ??= await this.createTimersStore();
		const timers = await this.TimersStore.loadTimers();

		const index = timers.findIndex(t => t.id === id);
		if (index === -1 || timers[index] === undefined) {
			throw new Error(throwMessage.NotFound(id));
		}

		const now = Date.now();

		const timer = timers[index];
		const remaining = Math.max(0, timer.stop - now);
		const newRemaining = Math.max(0, remaining + delay);

		timer.stop = now + newRemaining;
		await this.TimersStore.saveTimers(timers);
		return;
	 }
}

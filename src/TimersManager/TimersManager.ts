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

	// lock if the check loop is running, or not. This is used to prevent multiple check loops from running simultaneously and to indicate whether a file operation is in progress (e.g. loading or saving timers).
	protected checkLock: boolean = false;

	// Interval id of the check loop. If the loop is not running, this is undefined.
	protected interval: NodeJS.Timeout | undefined;
	// Indicates whether the check loop is running. This is used to control the loop and to prevent starting multiple loops simultaneously.
	protected running: boolean = false;

	protected abstract TimersStore: TimersStore<T, Extra>;

	// A simple promise queue to ensure that file operations are performed sequentially, preventing race conditions
	private queue: Promise<void> = Promise.resolve();
	protected runExclusive<T>(fn: () => Promise<T>) {
		const p = this.queue.then(fn);
		this.queue = p.then(() => {}, () => {});
		return p;
	}

	protected abstract type: T;

	/**
	 * constructor
	 * @param {string} timerfile timer file path.
	 * @description Initializes the TimersManager instance.
	 * @deprecated This constructor is deprecated. Please use the static `create` method instead, which performs necessary asynchronous initialization. The constructor will be made private in a future release.
	 * @example
	 * const manager = new TimersManager("/path/to/timers"); // Uses specified timer file path
	 */
	protected constructor(timerfile: string) {
		super();
		this.timerfiledir = timerfile;
	}

	/**
     * createTimer
     * @description Creates a new timer.
     * @param {CreateTimerOptions<T, Extra>} options Timer duration in milliseconds for PlainText or an object with length and extra for JSONL.
     * @returns Promise that resolves to the timer ID (UUID)
     * @throws If length is invalid (e.g. length < 0) or file operation fails
     * @example
     * // For PlainTextTimersManager
     * const manager = await PlainTextTimersManager.create();
     * const newTimerId = await manager.createTimer(5000); // Create a 5-second timer
     *
     * // For JSONLTimersManager
     * const jsonlManager = await JSONLTimersManager.create<{ title: string }>();
     * const jsonlTimerId = await jsonlManager.createTimer({ length: 10000, extra: { title: "My JSONL Timer" } }); // Create a 10-second timer with extra data
     */
	public async createTimer(options: CreateTimerOptions<T, Extra>): Promise<string> {
		return this.runExclusive(async () => {
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
		});
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
		return this.runExclusive(async () => {
			const timers = await this.TimersStore.loadTimers();

			const index = timers.findIndex(t => t.id === id);
			if (index === -1 || timers[index] === undefined) {
				throw new Error(throwMessage.NotFound(id));
			}

			timers.splice(index, 1);
			await this.TimersStore.saveTimers(timers);
			return;
		});
	}

	/**
	 * checkStart
	 * @description Starts the timer checking loop. This method should be called once after creating an instance of TimersManager to detect expired timers.
	 * @param {number} [interval=200] Polling interval in milliseconds (default: 200ms)
	 * @returns Promise<void> that resolves when the loop has been started
	 * @throws If file operation fails during checking
	 * @example
	 * await manager.checkStart(1000); // Check for expired timers every 1 second
	 */
	public async checkStart(
		interval: number = 200,
	): Promise<void> {

		if (this.running) return;
		this.running = true;

		const loop = async () => {
			if (!this.running) return;
			if (this.checkLock) return;

			this.checkLock = true;

			try {
				const expiredTimers = await this.runExclusive(async () => {
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

					return expired;
				});

				for (const timer of expiredTimers) {
					try {
						await this.emit("expired", timer);
					} catch (e) {
						await this.emit("errored", e instanceof Error ? e : new Error(String(e)));
					}
				}

			} catch (e) {
				await this.emit("errored", e instanceof Error ? e : new Error(String(e)));
				this.running = false;
			} finally {
				this.checkLock = false;
				if (this.running) {
					this.interval = setTimeout(loop, interval);
				}
			}
		};

		this.emit("started", void 0);
		this.interval = setTimeout(loop, interval);
	}

	/**
	 * checkStop
	 * @description Stops the timer checking loop.
	 * @returns Promise resolving when the loop has been stopped
	 * @example
	 * await manager.checkStart(1000);
	 * // ... later, to stop checking:
	 * await manager.checkStop();
	 */
	public async checkStop(): Promise<void> {
		this.running = false;
		if (this.interval) {
			clearTimeout(this.interval);
			this.interval = undefined;
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
	 * console.log(JSON.stringify(timers));
	 */
	public async showTimers(): Promise<Timer<T, Extra>[]> {
		return this.runExclusive(async () => {
			const timersData = await this.TimersStore.loadTimers();
			return timersData;
		});
	}

	/**
     * adjustRemainingTime
      * @description Adjusts the remaining time of a timer.
      * @param {string} id ID of the timer to modify
      * @param {number} delay Delay in milliseconds to add/subtract from the remaining time
      * @returns Promise resolving when the operation is complete
      * @throws If file operation fails
	  * @example
	  * const timer = await manager.createTimer(10000); // Create a 10-second timer
	  * await manager.adjustRemainingTime(timer, -2000); // Subtract 2 seconds from the remaining time (now 8 seconds left)
	  * await manager.adjustRemainingTime(timer, 3000); // Add 3 seconds to the remaining time (now 11 seconds left)
      */
	public async adjustRemainingTime(id: string, delay: number): Promise<void> {
		return this.runExclusive(async () => {
			if (typeof delay !== "number" || !Number.isFinite(delay)) {
				throw new Error(throwMessage.InvalidAdjustment(delay));
			}

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
		});
	 }
}

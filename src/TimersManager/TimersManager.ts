import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";

import searchRoot from "../searchRoot.js";
import type { CreateTimerOptions, StorageType, Timer, ListenerMap, TimerEvents } from "../types.js";
import { TimersStore } from "../TimersStore/TimersStore.js";

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
	protected checkLock: boolean = false;

	protected TimersStore: TimersStore<T, Extra> | null = null;

	private queue: Promise<void> = Promise.resolve();
	protected runExclusive<T>(fn: () => Promise<T>) {
		const p = this.queue.then(fn);
		this.queue = p.then(() => {}, () => {});
		return p;
	}

	protected abstract getDefaultFilename(): string;
	protected abstract createTimersStore(): Promise<TimersStore<T, Extra>>;
	protected abstract type: T;

	/**
      * constructor
      * @description Initializes the TimersManager instance. If the timer file does not exist, an empty file is created.
      * @param {string} [options] (string, optional) Configuration timer file path and it is treated as the timer file path.
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
     * @param {{length: number, extra: Extra} | number} options Timer duration in milliseconds and extra field(only JSONL)
     * @returns Promise that resolves to the timer ID (UUID)
     * @throws If length is invalid(e.g. length < 0) or file operation fails
     * @example
     * const manager = new TimersManager();
     * const newTimer = await manager.createTimer(5000);
     * // newTimer will be id of the timer
     */
	public async createTimer(options: CreateTimerOptions<T, Extra>): Promise<string> {
		return this.runExclusive(async () => {
			this.TimersStore ??= await this.createTimersStore();

			if (this.type === "JSONL" && typeof options === "number") {
				throw new Error(`Cannot create timer without extra fields in JSONL`);
			}

			let length: number = typeof options === "object" ? options.length : options;
			if (length < 0) throw new Error(`Invalid length: ${length}`);

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
			await this.emit("started", newTimerData);
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
			this.TimersStore ??= await this.createTimersStore();
			const timers = await this.TimersStore.loadTimers();

			const index = timers.findIndex(t => t.id === id);
			if (index === -1 || timers[index] === undefined) {
				throw new Error(`Timer with id ${id} not found`);
			}

			timers.splice(index, 1);
			await this.TimersStore.saveTimers(timers);
			await this.emit("stopped", timers[index]);
			return;
		});
	}

	/**
	 * checkStart
	 * @description Starts the timer checking loop. This method should be called once after creating an instance of TimersManager to detect expired timers.
	 * @param {number} [interval=200] Polling interval in milliseconds (default: 200ms)
	 * @returns The interval ID which can be used to stop the loop with clearInterval
	 * @throws If file operation fails during checking
	 * @example
	 * const manager = new TimersManager();
	 * manager.checkStart(1000); // Check for expired timers every 1 second 
	 */
	public async checkStart(
		interval: number = 200
	): Promise<NodeJS.Timeout> {

		this.TimersStore ??= await this.createTimersStore();

		const loop = async () => {
			if (this.checkLock) return;
			this.checkLock = true;

			let expiredTimers: Timer<T, Extra>[] = [];

			try {
				expiredTimers = await this.runExclusive(async () => {
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

			} catch (e) {
				this.emit("errored", e instanceof Error ? e : new Error(String(e))).catch(() => {});
				this.checkLock = false;
				return;
			}
			for (const timer of expiredTimers) {
				try {
					await this.emit("expired", timer);
				} catch (e) {
					await this.emit("errored", e instanceof Error ? e : new Error(String(e)));
				}
			}

			this.checkLock = false;
		};

		return setInterval(loop, interval);
	}

	private listeners: ListenerMap<T, Extra> = {};

	public on<K extends keyof TimerEvents<T, Extra>>(
		event: K,
		listener: (payload: TimerEvents<T, Extra>[K]) => void | Promise<void>
	): void {
		if (!this.listeners[event]) {
			this.listeners[event] = [];
		}
		this.listeners[event]!.push(listener);
	}

	public once<K extends keyof TimerEvents<T, Extra>>(
		event: K,
		listener: (payload: TimerEvents<T, Extra>[K]) => void | Promise<void>
	): void {
		const wrapper = (payload: TimerEvents<T, Extra>[K]) => {
			this.off(event, wrapper);
			return listener(payload);
		};
		this.on(event, wrapper);
	}

	public off<K extends keyof TimerEvents<T, Extra>>(
		event: K,
		listener: (payload: TimerEvents<T, Extra>[K]) => void | Promise<void>
	): void {
		const listeners = this.listeners[event];
		if (!listeners) return;

		const index = listeners.indexOf(listener);
		if (index !== -1) {
			listeners.splice(index, 1);
		}
	}

	public offAll<K extends keyof TimerEvents<T, Extra>>(
		event: K
	): void {
		this.listeners[event] = [];
	}

	public async emit<K extends keyof TimerEvents<T, Extra>>(
		event: K,
		payload: TimerEvents<T, Extra>[K]
	): Promise<void> {
		const listeners = this.listeners[event];
		if (!listeners?.length) return;

		const errors: unknown[] = [];

		await Promise.all(
			listeners.map(async l => {
			try {
				await l(payload);
			} catch (e) {
				errors.push(e);
			}
			})
		);

		if (errors.length > 0) {
			throw new AggregateError(errors, `Errors in event "${event}"`);
		}
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
      * @param {string} id ID of the timer to modify
      * @param {number} delay Delay in milliseconds to add/subtract from the remaining time
      * @returns Promise resolving when the operation is complete
      * @throws If file operation fails
      */
	public async adjustRemainingTime(id: string, delay: number): Promise<void> {
		return this.runExclusive(async () => {
			this.TimersStore ??= await this.createTimersStore();
			const timers = await this.TimersStore.loadTimers();

			const index = timers.findIndex(t => t.id === id);
			if (index === -1 || timers[index] === undefined) {
				throw new Error(`Timer with id ${id} not found`);
			}

			const old = { ...timers[index] };

			const now = Date.now();

			const timer = timers[index];
			const remaining = Math.max(0, timer.stop - now);
			const newRemaining = Math.max(0, remaining + delay);

			timer.stop = now + newRemaining;
			await this.TimersStore.saveTimers(timers);
			await this.emit("updated", { old, new: timer });
			return;
		});
	 }
}

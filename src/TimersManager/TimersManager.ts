import path from "path";
import fs from "fs";
import searchRoot from "../searchRoot.js";
import type { CreateTimerOptions, StorageType, Timer, TimersManagerOptions } from "../types.js";
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
export abstract class TimersManager<T extends StorageType> {
	protected readonly timerfiledir: string;
	protected checkLock: boolean = false;
	/**
	 * operationLock
	 * @description This boolean flag acts as a higher-level, in-process mutual exclusion lock
	 * within the `TimersManager` to ensure atomicity of complex "read-modify-write" operations
	 * (e.g., `removeTimer`, `adjustRemainingTime`) that involve multiple calls to `TimersStore`
	 * (like `loadTimers` followed by `saveTimers`).
	 * It prevents race conditions when these operations are executed concurrently, for example,
	 * when `checkTimers` processes multiple expired timers in parallel.
	 * IMPORTANT: This lock mechanism only provides mutual exclusion within a single
	 * process/instance of the application. It does NOT protect against concurrent
	 * access from multiple different processes, multiple instances of the application,
	 * or external programs modifying the timer file.
	 */
	protected operationLock: boolean = false;

	protected disableCache: boolean = false;
	protected TimersStore: TimersStore<T> | null = null;

	protected abstract getDefaultFilename(): string;

	/**
      * constructor
      * @description Initializes the TimersManager instance. If the timer file does not exist, an empty file is created. Cache is enabled by default.
      * @param options (TimersManagerOptions | string, optional) Configuration object or timer file path. If a string is provided, it is treated as the timer file path. If an object is provided, `timerfiledir` and `disableCache` can be specified.
      * @throws If file access or creation fails
      * @example
      * const manager = new TimersManager(); // Uses default timer file path (cache enabled)
      * const managerWithPath = new TimersManager("/path/to/timers.txt"); // Uses specified timer file path
      * const managerNoCache = new TimersManager({ disableCache: true }); // Disables cache
      */
	constructor(
		options?: TimersManagerOptions,
	) {
		const rootDir = searchRoot();
		if (typeof options === "string") {
			this.timerfiledir = path.resolve(rootDir, options);
			if (!this.timerfiledir.startsWith(rootDir)) {
				throw new Error(`Timer file path must be within the project directory`);
			}
		} else {
			const timerfiledir = options?.timerfiledir ? path.resolve(rootDir, options.timerfiledir) : path.join(rootDir, this.getDefaultFilename());
			this.timerfiledir = timerfiledir;
			if (!this.timerfiledir.startsWith(rootDir)) {
				throw new Error(`Timer file path must be within the project directory`);
			}
			this.disableCache = options?.disableCache ?? false;
		}
		try {
			fs.accessSync(this.timerfiledir);
		} catch {
			fs.writeFileSync(this.timerfiledir, "");
		}
	}

	/**
	 * ensureOperationLock
	 * @description Ensures that only one "read-modify-write" operation is performed at a time.
	 * This method will pause execution until `operationLock` is false, then acquire it.
	 * The lock must be explicitly released by setting `operationLock = false` in a `finally` block
	 * after the protected operation completes.
	 */
	protected ensureOperationLock(): Promise<void> {
		return new Promise((resolve) => {
			const checkLock = () => {
				if (!this.operationLock) {
					resolve();
				} else {
					setTimeout(checkLock, 50);
				}
			};
			checkLock();
		});
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
     public abstract createTimer(options: CreateTimerOptions<T>): Promise<string>;

	/**
     * removeTimer
     * @description Removes a timer by ID.
     * @param id ID of the timer to remove
     * @returns void
     * @throws If file operation fails
     * @example
     * await manager.removeTimer(id);
     */
	public abstract removeTimer(id: string): Promise<void>;

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
     public abstract checkTimers(callback: (timer: Timer<T>) => Promise<void>, interval?: number): Promise<NodeJS.Timeout>;

	/**
     * showTimers
     * @description Retrieves all active timers.
     * @returns Array of `Timer` objects
     * @throws If file operation fails
     * @example
     * const timers = await manager.showTimers();
     * console.log(JSON.stringify(timers))
     */
	public abstract showTimers(): Promise<Timer<T>[]>;

     /**
      * adjustRemainingTime
      * @description Adjusts the remaining time of a timer.
      * @param id ID of the timer to modify
      * @param delay Delay in milliseconds to add/subtract from the remaining time
      * @returns Promise resolving when the operation is complete
      * @throws If file operation fails
      */
     public abstract adjustRemainingTime(id: string, delay: number): Promise<void>;
}

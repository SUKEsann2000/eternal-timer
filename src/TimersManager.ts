import path from "path";
import fs from "fs";
import searchRoot from "./searchRoot.js";
import type { CreateTimerOptions, StorageType, Timer, TimersManagerOptions } from "./types.js";

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

     protected readonly disableCache: boolean;
     protected cachedTimers: Timer<T>[] = [];

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
          if (typeof options === "string") {
               this.timerfiledir = path.resolve(options);
               this.disableCache = false;
          } else {
               const timerfiledir = options?.timerfiledir ? path.resolve(options.timerfiledir) : path.join(searchRoot(), this.getDefaultFilename());
               this.timerfiledir = timerfiledir;
               this.disableCache = options?.disableCache ?? false;
          }
		try {
			fs.accessSync(this.timerfiledir);
		} catch {
			fs.writeFileSync(this.timerfiledir, "");
		}
	}

	/**
	 * checkTimerfileSyntax
	 * @description Checks the syntax of the timer file.
	 * @param fileData 
	 * @returns void
	 * @throws If syntax is invalid
	 */
	protected abstract checkTimerfileSyntax(fileData: string): Promise<void>;

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
     public abstract checkTimers(callback: (timer: Timer<T>) => Promise<void>, interval?: number): NodeJS.Timeout;

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

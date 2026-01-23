import path from "path";
import fs from "fs";
import searchRoot from "./searchRoot.js";
import type { Timer } from "./types.js";

/**
 * TimersManager
 * @description
 * Manages timers stored in a file.
 * (This is a abstract class)
 *
 * - Timers are persisted in a file
 * - Expired timers are detected by polling
 */
export abstract class TimersManager {
	protected readonly timerfiledir: string;
	protected checkLock: boolean = false;

	protected abstract getDefaultFilename(): string;

	/**
     * constructor
     * @param timerfiledir(string, optional)
     * If omitted, `.timers.jsonl` under the project root is used.
     */
	constructor(
		timerfiledir?: string,
	) {
		this.timerfiledir =
            timerfiledir ?? path.join(searchRoot(), this.getDefaultFilename());

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
	public abstract createTimer(length:number, title?: string, description?: string): Promise<string>;

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
     * @param interval (number, optional): Check interval in milliseconds (default: 50ms)
     * @throws If file operation fails
	 * @returns (NodeJS.Timeout) intervalId interval id of checkTimers
     * @example
     * const interval = manager.checkTimers((timer) => {
     *     console.log(`A timer was stopped: ${timer.id}`);
     * });
     */
	public abstract checkTimers(callback: (timer: Timer) => Promise<void>, interval?: number): NodeJS.Timeout;

	/**
     * showTimers
     * @description Retrieves all active timers.
     * @returns Array of `Timer` objects
     * @throws If file operation fails
     * @example
     * const timers = await manager.showTimers();
     * console.log(JSON.stringify(timers))
     */
	public abstract showTimers(): Promise<Timer[]>;
}

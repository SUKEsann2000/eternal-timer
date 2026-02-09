import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import readline from "readline";

import type { Timer, CreateTimerOptions } from "./types.js";
import { TimersManager } from "./TimersManager.js";
import { Log } from "./Log.js";

/**
 * JSONLTimersManager
 * @description
 * Manages timers stored in a  JSONL file.
 * (This is a abstract class)
 *
 * - Timers are persisted in a file
 * - Expired timers are detected by polling
 */
export class JSONLTimersManager extends TimersManager<"JSON"> {
	protected override getDefaultFilename(): string {
		return ".timers.jsonl";
	}

	protected async checkTimerfileSyntax(fileData: string): Promise<void> {
		const throwing = () => {
			throw new Error(`Timer file's syntax is wrong`);
		};
		const timersData = fileData
			.split('\n')
			.map(l => l.trim())
			.filter(l => l !== "");
		for (const timerData of timersData) {
			const parsed: Timer<"JSON"> = JSON.parse(timerData);
			if (!parsed.id || typeof parsed.id !== "string" || parsed.id.length !== 36) throwing();
			if (!parsed.start || typeof parsed.start !== "number" || parsed.start.toString().trim() === "") throwing();
			if (!parsed.stop || typeof parsed.stop !== "number" || parsed.stop.toString().trim() === "") throwing();
			if (parsed.title && typeof parsed.title !== "string") throwing();
			if (parsed.description && typeof parsed.description !== "string") throwing();
		}
		return;
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
	public override async createTimer(length: number, { title, description }: CreateTimerOptions<"JSON"> = {}): Promise<string> {
		try {
			if (length < 0) {
				throw new Error(`Invailed length: ${length}`);
			}
			
			const timersRaw = await fs.promises.readFile(this.timerfiledir, "utf-8");
			await this.checkTimerfileSyntax(timersRaw);

			length = Math.trunc(length);

			// uuid, start, end
			const id = uuidv4();
			const now = Date.now();
			const newTimerData: string = JSON.stringify({
				id,
				start: now,
				stop: (now + length),
				...(title !== undefined && { title }),
				...(description !== undefined && { description }),
			});
			await fs.promises.appendFile(this.timerfiledir, newTimerData + "\n");
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
			const timersRaw: string = await fs.promises.readFile(this.timerfiledir, "utf-8");
			await this.checkTimerfileSyntax(timersRaw);

			const rl = readline.createInterface({
				input: fs.createReadStream(this.timerfiledir),
				crlfDelay: Infinity,
			});

			let newTimersData: string = "";
			let found = false;

			for await (const line of rl) {
				if (!line.trim()) continue;
				const timerData: Timer<"JSON"> = JSON.parse(line);
				if (timerData.id === id) {
					found = true;
					continue;
				}
				newTimersData += `${JSON.stringify(timerData, null, 0)}\n`;
			}
			if (!found) {
				throw new Error(`Timer with id ${id} not found`);
			}

			await fs.promises.writeFile(this.timerfiledir, newTimersData, "utf-8");
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
	public override checkTimers(callback: (timer: Timer<"JSON">) => Promise<void>, interval: number = 200): NodeJS.Timeout {
		return setInterval(async () => {
			if (this.checkLock) return;
			this.checkLock = true;

			try {
				const rl = readline.createInterface({
					input: fs.createReadStream(this.timerfiledir),
					crlfDelay: Infinity,
				});

				for await (const line of rl) {
					if (!line.trim()) continue;
					const timerData: Timer<"JSON"> = JSON.parse(line);
					const now = Date.now();
					if (Number(timerData.stop) <= now) {
						await this.removeTimer(timerData.id);
						callback(timerData).catch(async (e) => {
							await Log.ensureLogger();
							if (Log.loggerInstance) {
								Log.loggerInstance.error(`Error in callback of checkTimers: ${e}`);
							}
						});
					}
				}
			} catch (e) {
				await Log.ensureLogger();
				if (Log.loggerInstance) {
					Log.loggerInstance.error(`Error when checking alarm: ${e}`);
				}
			} finally {
				this.checkLock = false;
			}
		}, interval);
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
	public override async showTimers(): Promise<Timer<"JSON">[]> {
		try {
			const timersRaw: string = await fs.promises.readFile(this.timerfiledir, "utf-8");
			const timersData: Timer<"JSON">[] = timersRaw
				.split(/\r?\n/)
				.filter(t => t.trim())
				.map(line => JSON.parse(line) as Timer<"JSON">);
			
			return timersData;
		} catch (e) {
			throw new Error(`Error when showing timers: ${e}`);
		}
	}
}
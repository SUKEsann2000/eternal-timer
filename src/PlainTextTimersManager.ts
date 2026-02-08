import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import readline from "readline";

import type { Timer, CreateTimerOptions } from "./types.js";
import { TimersManager } from "./TimersManager.js";
import { Log } from "./Log.js";

export class PlainTextTimersManager extends TimersManager {
	protected getDefaultFilename(): string {
		return ".timers";
	}

	/**
	 * checkTimerfileSyntax
	 * @description Checks the syntax of the timer file.
	 * @param fileData 
	 * @returns void
	 * @throws If syntax is invalid
	 */
	protected async checkTimerfileSyntax(fileData: string): Promise<void> {
		const throwing = () => {
			throw new Error(`Timer file's syntax is wrong`);
		};
		const timersData = fileData
			.split('\n')
			.map(l => l.trim())
			.filter(l => l !== "");
		for (const timerData of timersData) {
			const timerArray: string[] = timerData.split(/\s+/);
			if (timerArray.length !== 3) throwing();
			if (timerArray[0]?.length !== 36) throwing();
			if (timerArray[1]!.trim() === "") throwing();
			if (timerArray[2]!.trim() === "") throwing();
		}
		return;
	}

	/**
	 * createTimer
	 * @description Creates a new timer.
	 * @param length 
	 * @returns Promise that resolves to the timer ID (UUID)
	 * @throws If length is invalid(e.g. length < 0) or file operation fails
	 * @example
	 * const manager = new PlainTextTimersManager();
	 * const newTimer = await manager.createTimer(5000);
	 * // newTimer will be id of the timer
	 */
	public async createTimer(length: number, createTimerOptions?: CreateTimerOptions<"PlainText">): Promise<string> {
		try {
			if (createTimerOptions) {
				await Log.ensureLogger();
				if (Log.loggerInstance) {
					Log.loggerInstance.warn(`Tips: If you select PlainText storage type, you don't have to set createTimerOptions.`);
				}
			}
			if (length < 0) {
				throw new Error(`Invailed length: ${length}`);
			}

			const timersRaw = await fs.promises.readFile(this.timerfiledir, "utf-8");
			await this.checkTimerfileSyntax(timersRaw);

			length = Math.trunc(length);

			// uuid, start, end
			const id = uuidv4();
			const now = Date.now();
			const newTimerData = `${id} ${now.toString()} ${(now + length).toString()}`;
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
	public async removeTimer(id: string): Promise<void> {
		try {
			const timersRaw: string = await fs.promises.readFile(this.timerfiledir, "utf-8");
			await this.checkTimerfileSyntax(timersRaw);
			
			const rl = readline.createInterface({
				input: fs.createReadStream(this.timerfiledir),
				crlfDelay: Infinity,
			});
			const newTimersDataLines: string[] = [];
			let found = false;
			for await (const line of rl) {
				if (!line.trim()) continue;
				const [timerId] = line.split(" ");
				if (timerId === id) {
					found = true;
					continue;
				}
				newTimersDataLines.push(line);
			}
			if (!found) {
				throw new Error(`Timer with id ${id} not found`);
			}
			await fs.promises.writeFile(this.timerfiledir, newTimersDataLines.join("\n"), "utf-8");
			return;
		} catch (e) {
			throw new Error(`Error when removing timer: ${e}`);
		}
	}

	/**
	 * checkTimers
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
	public checkTimers(callback: (timer: Timer<"PlainText">) => Promise<void>, interval: number = 200): NodeJS.Timeout {
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
					const [id, startStr, stopStr] = line.split(" ");
					const timer: Timer<"PlainText"> = {
						id: id!,
						start: Number(startStr!),
						stop: Number(stopStr!),
					};
					const now = Date.now();
					if (Number(timer.stop) <= now) {
						await this.removeTimer(timer.id);
						callback(timer).catch(async (e) => {
							await Log.ensureLogger();
							if (Log.loggerInstance) {
								Log.loggerInstance.error(`Error in timer callback: ${e}`);
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
	public async showTimers(): Promise<Timer<"PlainText">[]> {
		try {
			const timersRaw: string = await fs.promises.readFile(this.timerfiledir, "utf-8");
			const timersData: string[] = timersRaw.split(/\r?\n/);

			const timersJSON: Timer<"PlainText">[] = [];
			for (const timerData of timersData) {
				const splitedTimerData = timerData.split(" ");
				if (!timerData.trim()) continue;
				timersJSON.push({
					id: splitedTimerData[0]!,
					start: Number(splitedTimerData[1]!),
					stop: Number(splitedTimerData[2]!),
				});
			}
			return timersJSON;
		} catch (e) {
			throw new Error(`Error when showing timers: ${e}`);
		}
	}
}

import fs from "fs";
import path from "path";
import searchRoot from "./searchRoot.js";
import { v4 as uuidv4 } from "uuid";

export type Timer = {
    id: string,
    start: number,
    stop: number,
	title?: string,
	description?: string
}

async function checkTimerfileSyntax(fileData: string, isJSONLines: boolean): Promise<void> {
	const throwing = () => {
		throw new Error(`Timer file's syntax is wrong`);
	};
	const timersData = fileData
		.split('\n')
		.map(l => l.trim())
		.filter(l => l !== "");
	if (isJSONLines) {
		for (const timerData of timersData) {
			const parsed: Timer = JSON.parse(timerData);
			if (!parsed.id || typeof parsed.id !== "string" || parsed.id.length !== 36) throwing();
			if (!parsed.start || typeof parsed.start !== "number" || parsed.start.toString().trim() === "") throwing();
			if (!parsed.stop || typeof parsed.stop !== "number" || parsed.stop.toString().trim() === "") throwing();
			if (parsed.title && typeof parsed.title !== "string") throwing();
			if (parsed.description && typeof parsed.description !== "string") throwing();
		}
	} else {
		for (const timerData of timersData) {
			const timerArray: string[] = timerData.split(/\s+/);
			if (timerArray.length !== 3) throwing();
			if (timerArray[0]?.length !== 36) throwing();
			if (timerArray[1]!.trim() === "") throwing();
			if (timerArray[2]!.trim() === "") throwing();
		}
	}
	return;
}

/**
 * TimersManager
 * @description
 * Manages timers stored in a file.
 * Each timer is stored as: `id start stop`.
 *
 * - Timers are persisted in a file
 * - Expired timers are detected by polling
 */
export class TimersManager {
	private readonly timerfiledir: string;
	private readonly isJSONLines: boolean;
	private checkLock: boolean = false;

	/**
     * constructor
     * @param timerfiledir(string, optional)
     * If omitted, `.timers.jsonl` under the project root is used.
     */
	constructor(
		timerfiledir?: string,
	) {
		this.timerfiledir =
            timerfiledir ?? path.join(searchRoot(), ".timers.jsonl");
		
		this.isJSONLines = this.timerfiledir.endsWith(".jsonl");

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
	public async createTimer(length: number, title?: string, description?: string): Promise<string> {
		try {
			if (length < 0) {
				throw new Error(`Invailed length: ${length}`);
			}
			if (!this.isJSONLines) {
				if (title || description) {
					// out warn
				}
			}
			
			const timersRaw = await fs.promises.readFile(this.timerfiledir, "utf-8");
			await checkTimerfileSyntax(timersRaw, this.isJSONLines);

			length = Math.trunc(length);

			// uuid, start, end
			const id = uuidv4();
			const now = Date.now();
			let newTimerData: string;
			if (this.isJSONLines) {
				const json: Timer = {
					id,
					start: now,
					stop: (now + length),
					...(title !== undefined && { title }),
					...(description !== undefined && { description }),
				};
				newTimerData = JSON.stringify(json, null, 0);
			} else {
				newTimerData = `${id} ${now.toString()} ${(now + length).toString()}`;
			}
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
			await checkTimerfileSyntax(timersRaw, this.isJSONLines);
			
			let newTimersData: string = "";
			if (this.isJSONLines) {
				const timersData: Timer[] = timersRaw
					.split(/\r?\n/)
					.filter(t => t.trim())
					.map(line => JSON.parse(line) as Timer);

				let found = false;
				for (const timerData of timersData) {
					if (!timerData) continue;

					if (timerData.id === id) {
						found = true;
						continue;
					}
					newTimersData += `${JSON.stringify(timerData, null, 0)}\n`;
				}
				if (!found) {
					throw new Error(`Timer with id ${id} not found`);
				}
			} else {
				const timersData: string[] = timersRaw.split(/\r?\n/);
				let found = false;

				for (const timerData of timersData) {
					if (!timerData.trim()) continue;
					const [timerId] = timerData.split(" ");
					if (timerId === id) {
						found = true;
						continue;
					}
					newTimersData += timerData + "\n";
				}            
				if (!found) {
					throw new Error(`Timer with id ${id} not found`);
				}
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
     * @param interval (number, optional): Check interval in milliseconds (default: 50ms)
     * @throws If file operation fails
	 * @returns (NodeJS.Timeout) intervalId interval id of checkTimers
     * @example
     * const interval = manager.checkTimers((timer) => {
     *     console.log(`A timer was stopped: ${timer.id}`);
     * });
     */
	public checkTimers(callback: (timer: Timer) => Promise<void>, interval: number = 50): NodeJS.Timeout {
		return setInterval(async () => {
			if (this.checkLock) return;
			this.checkLock = true;

			try {
				const timersDataRaw: string = await fs.promises.readFile(this.timerfiledir, "utf-8");
				const timersMap = new Map<string, Timer>();

				if (this.isJSONLines) {
					const timersData: Timer[] = timersDataRaw
						.split(/\r?\n/)
						.filter(line => line.trim())
						.map(line => JSON.parse(line) as Timer);

					for (const timer of timersData) {
						timersMap.set(timer.id, timer);
					}
				} else {
					const timersData: string[] = timersDataRaw.split(/\r?\n/);

					for (const timerData of timersData) {
						if (!timerData.trim()) continue;
						const [id, startStr, stopStr] = timerData.split(" ");
						timersMap.set(id! ,{
							id: id!,
							start: Number(startStr!),
							stop: Number(stopStr!),
						});
					}
				}

				const now = Date.now();
				for (const timer of timersMap.values()) {
					if (Number(timer.stop) <= now) {
						await this.removeTimer(timer.id);
						await callback(timer);
					}
				}
			} catch (e) {
				throw new Error(`Error when checking alarm: ${e}`);
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
	public async showTimers(): Promise<Timer[]> {
		try {
			const timersRaw: string = await fs.promises.readFile(this.timerfiledir, "utf-8");
			if (this.isJSONLines) {
				const timersData: Timer[] = timersRaw
					.split(/\r?\n/)
					.filter(t => t.trim())
					.map(line => JSON.parse(line) as Timer);
				
				return timersData;
			} else {
				const timersData: string[] = timersRaw.split(/\r?\n/);

				const timersJSON: Timer[] = [];
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
			}
		} catch (e) {
			throw new Error(`Error when showing timers: ${e}`);
		}
	}
}

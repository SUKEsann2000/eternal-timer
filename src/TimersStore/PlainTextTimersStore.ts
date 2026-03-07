import fs from "fs";

import type { Timer } from "../types.js";
import { TimersStore } from "./TimersStore.js";
import { Log } from "../Log.js";

export class PlainTextTimersStore extends TimersStore<"PlainText"> {
    
	private constructor(
		disableCache: boolean,
		timerfile: string,
	) {
		super(disableCache, timerfile);
	}

	static async create(
		disableCache: boolean,
		timerfile: string,
	): Promise<PlainTextTimersStore> {
		const store = new PlainTextTimersStore(disableCache, timerfile);

		await store.init();

		return store;
	}

	/**
     * checkTimerfileSyntax
     * @description Checks the syntax of the timer file.
     * @param fileData 
     * @returns void
     * @throws If syntax is invalid
     */
	protected override async checkTimerfileSyntax(timers: Timer<"PlainText">[]): Promise<void> {
		const throwing = () => {
			throw new Error(`Timer file's syntax is wrong`);
		};
		for (const timer of timers) {
			if (Object.keys(timer).length !== 3) throwing();
			if (timer.id?.length !== 36) throwing();
			if (timer.start.toString() === "") throwing();
			if (timer.stop.toString() === "") throwing();
			if (isNaN(Number(timer.start))) throwing();
			if (isNaN(Number(timer.stop))) throwing();
			if (Number(timer.start) > Number(timer.stop)) throwing();
		}
		return;
	}

	public override async loadTimers(): Promise<Timer<"PlainText">[]> {
		try {
			if (!this.disableCache && this.initialized) {
				return this.timers;
			}

			if (this.fileLock) {
				await this.ensureFileLock();
			}
			this.fileLock = true;
			const data = await fs.promises.readFile(this.timerfile, "utf-8");
			this.fileLock = false;
			const timersData: Timer<"PlainText">[] = data
				.split(/\r?\n/)
				.filter((line) => line.trim())
				.map((line) => {
					const [id, startStr, stopStr] = line.split(" ");
					return {
						id: id!,
						start: Number(startStr!),
						stop: Number(stopStr!),
					} as Timer<"PlainText">;
				});
			await this.checkTimerfileSyntax(timersData);
			return timersData;
		} catch (e) {
			throw new Error(`Error when loading timer data: ${e}`);
		} finally {
			this.fileLock = false;
		}
	}

	public override async saveTimers(timers: Timer<"PlainText">[]): Promise<void> {
		const data = this.toStringifyTimers(timers);

		if (!this.disableCache) {
			this.timers = timers;
		}

		try {
			if (this.fileLock) {
				await this.ensureFileLock();
			}
			this.fileLock = true;
			await fs.promises.writeFile(this.timerfile, data, "utf8");
			this.fileLock = false;
		} catch (e) {
			throw new Error(`Error when saving timer data: ${e}`);
		} finally {
			this.fileLock = false;
		}
	}

	public override async appendTimer(timer: Timer<"PlainText">): Promise<void> {
		try {
			if (!this.disableCache) {
				this.timers.push(timer);
			}

			if (this.fileLock) {
				await this.ensureFileLock();
			}
			this.fileLock = true;
			await fs.promises.appendFile(this.timerfile, this.toStringifyTimers([timer]) + "\n");
			this.fileLock = false;
			return;
		} catch (e) {
			await Log.ensureLogger();
			Log.loggerInstance?.error(`Error when appending timer data: ${e}`);
		} finally {
			this.fileLock = false;
		}
	}

	public override toStringifyTimers(timers: Timer<"PlainText">[]): string {
		if (timers.length === 0) {
			return "";
		}
		return timers.map(timer => `${timer.id} ${timer.start} ${timer.stop}`).join("\n") + "\n";
	}
}
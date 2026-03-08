import fs from "fs";

import type { Timer } from "../types.js";
import { TimersStore } from "./TimersStore.js";

export class JSONLTimersStore extends TimersStore<"JSONL"> {

	private constructor(
		disableCache: boolean,
		timerfile: string,
	) {
		super(disableCache, timerfile);
	}

	static async create(
		disableCache: boolean,
		timerfile: string,
	): Promise<JSONLTimersStore> {

		const store = new JSONLTimersStore(disableCache, timerfile);

		await store.init();

		return store;
	}

	/**
	 * checkTimerfileSyntax
	 * @description Checks the syntax of the timer file.
	 * @param timers Array of timer objects to check
	 * @returns void
	 * @throws If syntax is invalid
	 */
	protected override async checkTimerfileSyntax(timers: Timer<"JSONL">[]): Promise<void> {
		const throwing = () => {
			throw new Error(`Timer file's syntax is wrong`);
		};
		for (const timer of timers) {
			if (!timer.id || typeof timer.id !== "string" || timer.id.length !== 36) throwing();
			if (!timer.start || typeof timer.start !== "number" || timer.start.toString().trim() === "") throwing();
			if (!timer.stop || typeof timer.stop !== "number" || timer.stop.toString().trim() === "") throwing();
			if (timer.start > timer.stop) throwing();
			if (timer.title && typeof timer.title !== "string") throwing();
			if (timer.description && typeof timer.description !== "string") throwing();
		}
	}

	public override async loadTimers(): Promise<Timer<"JSONL">[]> {
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
			const timersData: Timer<"JSONL">[] = data
				.split(/\r?\n/)
				.filter((line) => line.trim())
				.map((line) => JSON.parse(line) as Timer<"JSONL">);
			await this.checkTimerfileSyntax(timersData);
			if (!this.disableCache) {
				this.timers = timersData;
			}
			return timersData;
		} catch (e) {
			throw new Error(`Error when loading timer data: ${e}`);
		} finally {
			this.fileLock = false;
		}
	}

	public override async saveTimers(timers: Timer<"JSONL">[]): Promise<void> {
		const data = this.toStringifyTimers(timers);

		try {
			if (this.fileLock) {
				await this.ensureFileLock();
			}
			this.fileLock = true;
			await fs.promises.writeFile(this.timerfile, data, "utf-8");
			if (!this.disableCache) {
				this.timers = timers;
			}
		} catch (e) {
			throw new Error(`Error when saving timer data: ${e}`);
		} finally {
			this.fileLock = false;
		}
	}

	public override async appendTimer(timer: Timer<"JSONL">): Promise<void> {
		try {
			const line = this.toStringifyTimers([timer]);
			if (this.fileLock) {
				await this.ensureFileLock();
			}

			this.fileLock = true;
			await fs.promises.appendFile(this.timerfile, line, "utf-8");
			if (!this.disableCache) {
				this.timers.push(timer);
			}
			this.fileLock = false;
		} catch (e) {
			throw new Error(`Error when appending timer data: ${e}`);
		} finally {
			this.fileLock = false;
		}
	}

	public override toStringifyTimers(timers: Timer<"JSONL">[]): string {
		if (timers.length === 0) {
			return "";
		}
		return timers.map(t => JSON.stringify(t)).join("\n") + "\n";
	}
}
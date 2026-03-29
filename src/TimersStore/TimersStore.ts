import fs from "fs/promises";

import type { StorageType, Timer } from "../types.js";
import { throwMessage } from "src/throwMessage.js";

export abstract class TimersStore<T extends StorageType, Extra extends object> {
	protected readonly timerfile: string;

	protected constructor(
		timerfile: string,
	) {
		this.timerfile = timerfile;
	}

	public async loadTimers(): Promise<Timer<T, Extra>[]> {
		try {
			const data = await fs.readFile(this.timerfile, "utf-8");
			const timersData: Timer<T, Extra>[] = this.parseTimers(data);
			await this.checkTimerfileSyntax(timersData);
			return timersData;
		} catch (e) {
			throw new Error(throwMessage.LoadTimerData, { cause: e });
		}
	}

	public async saveTimers(timers: Timer<T, Extra>[]): Promise<void> {
		const data = this.toStringifyTimers(timers);

		try {
			await fs.writeFile(this.timerfile, data, "utf-8");
		} catch (e) {
			throw new Error(throwMessage.SaveTimerData, { cause: e });
		}
	}

	public async appendTimer(timer: Timer<T, Extra>): Promise<void> {
		try {
			await fs.appendFile(this.timerfile, this.toStringifyTimers([timer]) + "\n");
			return;
		} catch (e) {
			throw new Error(throwMessage.AppendTimerData, { cause: e });
		}
	}

    protected abstract checkTimerfileSyntax(timers: Timer<T, Extra>[]): Promise<void>;
    public abstract toStringifyTimers(timers: Timer<T, Extra>[]): string;
	public abstract parseTimers(data: string): Timer<T, Extra>[];
}
import fs from "fs";

import type { StorageType, Timer } from "../types.js";

export abstract class TimersStore<T extends StorageType> {
	protected readonly timerfile: string;

	protected constructor(
		timerfile: string,
	) {
		this.timerfile = timerfile;
	}

    public async loadTimers(): Promise<Timer<T>[]> {
		try {
            const data = await fs.promises.readFile(this.timerfile, "utf-8");
            const timersData: Timer<T>[] = this.parseTimers(data);
            await this.checkTimerfileSyntax(timersData);
            return timersData;
        } catch (e) {
            throw new Error(`Error when loading timer data: ${e}`);
        }
    }

    public async saveTimers(timers: Timer<T>[]): Promise<void> {
		const data = this.toStringifyTimers(timers);

		try {
			await fs.promises.writeFile(this.timerfile, data, "utf-8");
		} catch (e) {
			throw new Error(`Error when saving timer data: ${e}`);
		}
	}

    public async appendTimer(timer: Timer<T>): Promise<void> {
		try {
			await fs.promises.appendFile(this.timerfile, this.toStringifyTimers([timer]) + "\n");
			return;
		} catch (e) {
			throw new Error(`Error when appending timer data: ${e}`);
		}
	}

    protected abstract checkTimerfileSyntax(timers: Timer<T>[]): Promise<void>;
    public abstract toStringifyTimers(timers: Timer<T>[]): string;
	public abstract parseTimers(data: string): Timer<T>[];
}
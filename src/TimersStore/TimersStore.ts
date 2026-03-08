import fs from "fs";

import type { StorageType, Timer } from "../types.js";

export abstract class TimersStore<T extends StorageType> {
	protected readonly disableCache: boolean;
	protected readonly timerfile: string;

	/**
	 * fileLock
	 * @description This boolean flag acts as an in-process lock to prevent race conditions
	 * when multiple asynchronous operations within the same `TimersStore` instance
	 * try to access or modify the timer file simultaneously.
	 * IMPORTANT: This lock mechanism only provides mutual exclusion within a single
	 * process/instance of the application. It does NOT protect against concurrent
	 * access from multiple different processes, multiple instances of the application,
	 * or external programs modifying the timer file. For robust multi-process
	 * file locking, OS-level mechanisms (e.g., `flock`) would be required.
	 */
	protected fileLock: boolean = false;

	protected initialized = false;
	protected timers: Timer<T>[] = [];

	protected constructor(
		disableCache: boolean,
		timerfile: string,
	) {
		this.disableCache = disableCache;
		this.timerfile = timerfile;

		if (disableCache) {
			this.initialized = true;
		}
	}

	protected async init(): Promise<void> {
		if (this.disableCache) return;

		await this.loadTimers();
		this.initialized = true;
	}

    public async loadTimers(): Promise<Timer<T>[]> {
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
			const timersData: Timer<T>[] = this.parseTimers(data);
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

    public async saveTimers(timers: Timer<T>[]): Promise<void> {
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

    public async appendTimer(timer: Timer<T>): Promise<void> {
		try {

			if (this.fileLock) {
				await this.ensureFileLock();
			}
			this.fileLock = true;
			await fs.promises.appendFile(this.timerfile, this.toStringifyTimers([timer]) + "\n");
			this.fileLock = false;

			if (!this.disableCache) {
				this.timers.push(timer);
			}
			return;
		} catch (e) {
			throw new Error(`Error when appending timer data: ${e}`);
		} finally {
			this.fileLock = false;
		}
	}

    protected abstract checkTimerfileSyntax(timers: Timer<T>[]): Promise<void>;
    public abstract toStringifyTimers(timers: Timer<T>[]): string;
	public abstract parseTimers(data: string): Timer<T>[];
    protected ensureFileLock(): Promise<void> {
    	return new Promise((resolve) => {
    		const checkLock = () => {
    			if (!this.fileLock) {
    				resolve();
    			} else {
    				setTimeout(checkLock, 50);
    			}
    		};
    		checkLock();
    	});
    }
}
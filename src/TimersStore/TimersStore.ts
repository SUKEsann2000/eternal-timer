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

    protected abstract checkTimerfileSyntax(timers: Timer<T>[]): Promise<void>;
    public abstract loadTimers(): Promise<Timer<T>[]>;
    public abstract saveTimers(timers: Timer<T>[]): Promise<void>;
    public abstract appendTimer(timer: Timer<T>): Promise<void>;
    public abstract toStringifyTimers(timers: Timer<T>[]): string;
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
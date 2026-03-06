import type { StorageType, Timer } from "../types.js";

export abstract class TimersStore<T extends StorageType> {
	protected readonly disableCache: boolean;
	protected readonly timerfile: string;

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

		this.timers = await this.loadTimers();
		this.initialized = true;
	}

    protected abstract checkTimerfileSyntax(timers: Timer<T>[]): Promise<void>;
    public abstract loadTimers(): Promise<Timer<T>[]>;
    public abstract saveTimers(timers: Timer<T>[]): Promise<void>;
    public abstract appendTimer(timer: Timer<T>): Promise<void>;
    public abstract toStringifyTimers(timers: Timer<T>[]): string;
}
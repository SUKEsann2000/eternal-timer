import type { StorageType, TimerEvents } from "./types.js";

export class EventEmitter<T extends StorageType, Extra extends object> {
	protected listeners: {
        [K in keyof TimerEvents<T, Extra>]?: ((
            payload: TimerEvents<T, Extra>[K]
        ) => void | Promise<void>)[]
    } = {};

	public on<K extends keyof TimerEvents<T, Extra>>(
		event: K,
		listener: (payload: TimerEvents<T, Extra>[K]) => void | Promise<void>,
	): void {
		if (!this.listeners[event]) {
			this.listeners[event] = [];
		}
        this.listeners[event]!.push(listener);
	}

	public once<K extends keyof TimerEvents<T, Extra>>(
		event: K,
		listener: (payload: TimerEvents<T, Extra>[K]) => void | Promise<void>,
	): void {
		const wrapper = (payload: TimerEvents<T, Extra>[K]) => {
			this.off(event, wrapper);
			return listener(payload);
		};
		this.on(event, wrapper);
	}

	public off<K extends keyof TimerEvents<T, Extra>>(
		event: K,
		listener: (payload: TimerEvents<T, Extra>[K]) => void | Promise<void>,
	): void {
		const listeners = this.listeners[event];
		if (!listeners) return;

		const index = listeners.indexOf(listener);
		if (index !== -1) {
			listeners.splice(index, 1);
		}
	}

	public offAll<K extends keyof TimerEvents<T, Extra>>(
		event: K,
	): void {
		this.listeners[event] = [];
	}

	protected async emit<K extends keyof TimerEvents<T, Extra>>(
		event: K,
		payload: TimerEvents<T, Extra>[K],
	): Promise<void> {
		const listeners = this.listeners[event];
		if (!listeners?.length) return;

		const errors: unknown[] = [];

		await Promise.all(
			listeners.map(async l => {
				try {
					await l(payload);
				} catch (e) {
					errors.push(e);
				}
			}),
		);

		if (errors.length > 0) {
			throw new AggregateError(errors, `Errors in event "${event}"`);
		}
	}
}

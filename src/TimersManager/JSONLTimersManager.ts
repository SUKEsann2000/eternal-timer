import { TimersManager } from "./TimersManager.js";
import { JSONLTimersStore } from "../TimersStore/JSONLTimersStore.js";

/**
 * JSONLTimersManager
 * @description
 * Manages timers stored in a  JSONL file.
 * (This is a abstract class)
 *
 * - Timers are persisted in a file
 * - Expired timers are detected by polling
 */
export class JSONLTimersManager<Extra extends object = {}> extends TimersManager<"JSONL", Extra> {
	protected override TimersStore: JSONLTimersStore<Extra> | null = null;

	protected override getDefaultFilename(): string {
		return ".timers.jsonl";
	}

	protected override async createTimersStore(): Promise<JSONLTimersStore<Extra>> {
		return new JSONLTimersStore<Extra>(this.timerfiledir);
	}

	public async changeTitle(id: string, newTitle: string): Promise<void> {
		return this.runExclusive(async () => {
			this.TimersStore ??= await this.createTimersStore();
			try {
				const timers = await this.TimersStore.loadTimers();

				const index = timers?.findIndex(t => t.id === id);
				if (index === -1) {
					throw new Error(`Timer with id ${id} not found`);
				}

				timers[index]!.title = newTitle;
				await this.TimersStore.saveTimers(timers);
			} catch (e) {
				throw new Error(`Error when changing title`, { cause: e });
			}
		});
	}

	public async changeDescription(id: string, newDescription: string): Promise<void> {
		return this.runExclusive(async () => {
			this.TimersStore ??= await this.createTimersStore();
			try {
				const timers = await this.TimersStore.loadTimers();

				const index = timers?.findIndex(t => t.id === id);
				if (index === -1) {
					throw new Error(`Timer with id ${id} not found`);
				}

				timers[index]!.description = newDescription;
				await this.TimersStore.saveTimers(timers);
			} catch (e) {
				throw new Error(`Error when changing description`, { cause: e });
			}
		});
	}
}
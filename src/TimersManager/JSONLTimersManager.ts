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
		return new JSONLTimersStore(this.timerfiledir);
	}

	public async changeExtra(
		id: string,
		newExtra: Extra
	) {
		return this.runExclusive(async () => {
			this.TimersStore ??= await this.createTimersStore();
			try {
				const timers = await this.TimersStore.loadTimers();

				const index = timers?.findIndex(t => t.id === id);
				if (index === -1) {
					throw new Error(`Timer with id ${id} not found`);
				}

				timers[index]!.extra = newExtra;
				await this.TimersStore.saveTimers(timers);
			} catch (e) {
				throw new Error(`Error when changing extra`, { cause: e });
			}
		});
	}
}
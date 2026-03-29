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
export class JSONLTimersManager<Extra extends object = object> extends TimersManager<"JSONL", Extra> {
	protected override TimersStore: JSONLTimersStore<Extra> | null = null;

	protected override getDefaultFilename(): string {
		return ".timers.jsonl";
	}

	protected override async createTimersStore(): Promise<JSONLTimersStore<Extra>> {
		return new JSONLTimersStore(this.timerfiledir);
	}

	protected override type: "JSONL" = "JSONL" as const;

	/**
	 * changeExtra
	 * @description Change extra field
	 * @param {string} id
	 * @param {Extra} newExtra
	 * @returns Promise resolving when the operation is complete
	 * @throws If timer with id not found or file operation fails
	 * @example
	 * const timer = await manager.createTimer({ length: 1000, extra: {author: "someone"} });
	 * await changeExtra(timer, {author: "SUKEsann2000"});
	 * // extra is changed and author will be "SUKEsann2000" instead of "someone"
	 */
	public async changeExtra(
		id: string,
		newExtra: Extra,
	): Promise<void> {
		return this.runExclusive(async () => {
			this.TimersStore ??= await this.createTimersStore();
			try {
				const timers = await this.TimersStore.loadTimers();

				const index = timers?.findIndex(t => t.id === id);
				if (index === -1 || timers[index] === undefined) {
					throw new Error(`Timer with id ${id} not found`);
				}

				const old = timers[index];

				timers[index].extra = newExtra;
				await this.TimersStore.saveTimers(timers);
				await this.emit("updated", { old, new: timers[index] });
			} catch (e) {
				throw new Error(`Error when changing extra`, { cause: e });
			}
		});
	}
}

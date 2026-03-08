import { TimersManager } from "./TimersManager.js";
import { JSONLTimersStore } from "../TimersStore/JSONLTimersStore.js";
import type { TimersStore } from "src/TimersStore/TimersStore.js";

/**
 * JSONLTimersManager
 * @description
 * Manages timers stored in a  JSONL file.
 * (This is a abstract class)
 *
 * - Timers are persisted in a file
 * - Expired timers are detected by polling
 */
export class JSONLTimersManager extends TimersManager<"JSONL"> {
	protected override TimersStore: JSONLTimersStore | null = null;

	protected override getDefaultFilename(): string {
		return ".timers.jsonl";
	}

	protected override async createTimersStore(): Promise<TimersStore<"JSONL">> {
		return await JSONLTimersStore.create(this.disableCache, this.timerfiledir);
	}
}
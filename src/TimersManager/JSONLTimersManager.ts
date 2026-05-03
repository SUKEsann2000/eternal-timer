import fs from "fs/promises";
import path from "path";

import searchRoot from "src/searchRoot.js";
import { TimersManager } from "./TimersManager.js";
import { JSONLTimersStore } from "../TimersStore/JSONLTimersStore.js";
import { throwMessage } from "../throwMessage.js";

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
	/**
	 * create
	 * @param {string | undefined} timerfile optional timer file path. If not provided, the default path will be used.
	 * @description Creates an instance of JSONLTimersManager. If the timer file does not exist, an empty file is created.
	 * @throws If file access or creation fails
	 * @example
	 * const manager = await JSONLTimersManager.create(); // Uses default timer file path
	 * const manager = await JSONLTimersManager.create("/path/to/timers.jsonl"); // Uses specified timer file path
	 * @returns Promise resolving to an instance of JSONLTimersManager
	 */
	public static async create<Extra extends object = object>(timerfile?: string): Promise<JSONLTimersManager<Extra>> {
		const rootDir = await searchRoot();
		const timerfiledir = path.resolve(rootDir, timerfile ?? ".timers.jsonl");
		if (!timerfiledir.startsWith(rootDir)) {
			throw new Error(throwMessage.FilePathinvalid);
		}
		const manager = new this<Extra>(timerfiledir);
		try {
			await fs.access(timerfiledir);
		} catch {
			await fs.writeFile(timerfiledir, "");
		}
		return manager;
	}

	/**
	 * constructor
	 * @param {string | undefined} timerfile optional timer file path. If not provided, the default path will be used.
	 * @description Initializes the JSONLTimersManager instance. If the timer file does not exist, an empty file is created.
	 * @throws If file access or creation fails
	 * @example
	 * const manager = new JSONLTimersManager(); // Uses default timer file path
	 * const manager = new JSONLTimersManager("/path/to/timers.jsonl"); // Uses specified timer file path 
	 */
	protected constructor(timerfile?: string) {
		super(timerfile);
		this.TimersStore = this.createTimersStore();
	}

	protected override TimersStore: JSONLTimersStore<Extra>;

	protected override getDefaultFilename(): string {
		return ".timers.jsonl";
	}

	protected override createTimersStore(): JSONLTimersStore<Extra> {
		return new JSONLTimersStore<Extra>(this.timerfiledir);
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
		try {
			const timers = await this.TimersStore.loadTimers();

			const index = timers?.findIndex(t => t.id === id);
			if (index === -1 || timers[index] === undefined) {
				throw new Error(throwMessage.NotFound(id));
			}

			timers[index].extra = newExtra;
			await this.TimersStore.saveTimers(timers);
		} catch (e) {
			throw new Error(throwMessage.ChangeExtra, { cause: e });
		}
	}
}

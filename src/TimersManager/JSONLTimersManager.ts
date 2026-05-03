import path from "path";
import fs from "fs/promises";

import searchRoot from "../searchRoot.js";
import { TimersManager } from "./TimersManager.js";
import { JSONLTimersStore } from "../TimersStore/JSONLTimersStore.js";
import { throwMessage } from "../throwMessage.js";

/**
 * JSONLTimersManager
 * @description
 * Manages timers stored in a JSONL file.
 *
 * - Timers are persisted in a file
 * - Expired timers are detected by polling
 */
export class JSONLTimersManager<Extra extends object> extends TimersManager<"JSONL", Extra> {
	public static readonly defaultFilename = ".timers.jsonl";

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
		const filename = timerfile ?? this.defaultFilename;
		const timerfiledir = path.isAbsolute(filename)
			? filename
			: path.resolve(rootDir, filename);

		if (!timerfiledir.startsWith(rootDir)) {
			throw new Error(throwMessage.FilePathinvalid);
		}
		try {
			await fs.access(timerfiledir);
		} catch {
			await fs.writeFile(timerfiledir, "");
		}
		return new this<Extra>(timerfiledir);
	}

	/**
	 * constructor
	 * @param {string} timerfiledir resolved timer file path.
	 * @description Initializes the JSONLTimersManager instance.
	 */
	protected constructor(timerfiledir: string) {
		super(timerfiledir);
		this.TimersStore = new JSONLTimersStore(this.timerfiledir);
	}

	protected override TimersStore: JSONLTimersStore<Extra>;

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
	 * await manager.changeExtra(timer, {author: "SUKEsann2000"});
	 * // extra is changed and author will be "SUKEsann2000" instead of "someone"
	 */
	public async changeExtra(
		id: string,
		newExtra: Extra,
	): Promise<void> {
		return this.runExclusive(async () => {
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
		});
	}
}

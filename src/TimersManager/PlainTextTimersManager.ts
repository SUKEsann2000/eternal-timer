import path from "path";
import fs from "fs/promises";

import searchRoot from "../searchRoot.js";
import { throwMessage } from "../throwMessage.js";
import { TimersManager } from "./TimersManager.js";
import { PlainTextTimersStore } from "../TimersStore/PlainTextTimersStore.js";

/**
 * PlainTextTimersManager
 * @description
 * Manages timers stored in a PlainText file.
 * (This is a abstract class)
 *
 * - Timers are persisted in a file
 * - Expired timers are detected by polling
 */
export class PlainTextTimersManager extends TimersManager<"PlainText", object> {
	/**
	 * create
	 * @param {string | undefined} timerfile optional timer file path. If not provided, the default path will be used.
	 * @description Creates an instance of PlainTextTimersManager. If the timer file does not exist, an empty file is created.
	 * @throws If file access or creation fails
	 * @example
	 * const manager = await PlainTextTimersManager.create(); // Uses default timer file path
	 * const manager = await PlainTextTimersManager.create("/path/to/.timers"); // Uses specified timer file path
	 * @returns Promise resolving to an instance of PlainTextTimersManager
	 */
	public static async create(timerfile?: string): Promise<PlainTextTimersManager> {
		const rootDir = await searchRoot();
		const manager = new this(timerfile);
		const timerfiledir = path.resolve(rootDir, manager.timerfiledir);
		if (!timerfiledir.startsWith(rootDir)) {
			throw new Error(throwMessage.FilePathinvalid);
		}
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
	 * @description Initializes the PlainTextTimersManager instance. If the timer file does not exist, an empty file is created.
	 * @throws If file access or creation fails
	 * @deprecated This constructor is deprecated. Please use the static `create` method instead, which performs necessary asynchronous initialization. The constructor will be made private in a future release.
	 * @example
	 * const manager = new PlainTextTimersManager(); // Uses default timer file path
	 * const manager = new PlainTextTimersManager("/path/to/.timers"); // Uses specified timer file path 
	 */
	protected constructor(timerfile?: string) {
		super(timerfile);
		this.TimersStore = new PlainTextTimersStore(this.timerfiledir);
	}

	protected override TimersStore: PlainTextTimersStore;

	protected override getDefaultFilename(): string {
		return ".timers";
	}

	protected async createTimersStore(): Promise<PlainTextTimersStore> {
		return new PlainTextTimersStore(this.timerfiledir);
	}

	protected override type: "PlainText" = "PlainText" as const;
}

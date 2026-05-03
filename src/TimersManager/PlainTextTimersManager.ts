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
 *
 * - Timers are persisted in a file
 * - Expired timers are detected by polling
 */
export class PlainTextTimersManager extends TimersManager<"PlainText", object> {
	public static readonly defaultFilename = ".timers";

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
		return new this(timerfiledir);
	}

	/**
	 * constructor
	 * @param {string} timerfiledir resolved timer file path.
	 * @description Initializes the PlainTextTimersManager instance.
	 */
	protected constructor(timerfiledir: string) {
		super(timerfiledir);
		this.TimersStore = new PlainTextTimersStore(this.timerfiledir);
	}

	protected override TimersStore: PlainTextTimersStore;

	protected override type: "PlainText" = "PlainText" as const;
}

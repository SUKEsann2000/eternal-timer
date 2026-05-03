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
	public static async create(timerfile?: string): Promise<PlainTextTimersManager> {
		const rootDir = await searchRoot();
		const timerfiledir = path.resolve(rootDir, timerfile ?? ".timers.jsonl");
		if (!timerfiledir.startsWith(rootDir)) {
			throw new Error(throwMessage.FilePathinvalid);
		}
		const manager = new this(timerfiledir);
		try {
			await fs.access(timerfiledir);
		} catch {
			await fs.writeFile(timerfiledir, "");
		}
		return manager;
	}

	protected constructor(timerfile?: string) {
		super(timerfile);
		this.TimersStore = this.createTimersStore();
	}

	protected override TimersStore: PlainTextTimersStore;

	protected override getDefaultFilename(): string {
		return ".timers";
	}

	protected override createTimersStore(): PlainTextTimersStore {
		return new PlainTextTimersStore(this.timerfiledir);
	}

	protected override type: "PlainText" = "PlainText" as const;
}

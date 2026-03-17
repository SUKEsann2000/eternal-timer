import { validate } from "uuid";

import type { Timer } from "../types.js";
import { TimersStore } from "./TimersStore.js";

export class PlainTextTimersStore<Extra extends object = {}> extends TimersStore<"PlainText", Extra> {

	constructor(
		timerfile: string,
	) {
		super(timerfile);
	}

	/**
     * checkTimerfileSyntax
     * @description Checks the syntax of the timer file.
     * @param fileData
     * @returns void
     * @throws If syntax is invalid
     */
	protected override async checkTimerfileSyntax(timers: Timer<"PlainText", Extra>[]): Promise<void> {
		const throwing = () => {
			throw new Error(`Timer file's syntax is wrong`);
		};
		for (const timer of timers) {
			if (Object.keys(timer).length !== 3) throwing();
			if (!validate(timer.id)) throwing();
			if (isNaN(Number(timer.start))) throwing();
			if (isNaN(Number(timer.stop))) throwing();
			if (Number(timer.start) > Number(timer.stop)) throwing();
		}
		return;
	}

	public override toStringifyTimers(timers: Timer<"PlainText", Extra>[]): string {
		if (timers.length === 0) {
			return "";
		}
		return timers.map(timer => `${timer.id} ${timer.start} ${timer.stop}`).join("\n");
	}

	public override parseTimers(data: string): Timer<"PlainText", Extra>[] {
		return data
			.split(/\r?\n/)
			.filter((line) => line.trim())
			.map((line) => {
				const [id, startStr, stopStr] = line.split(" ");
				return {
					id: id!,
					start: Number(startStr!),
					stop: Number(stopStr!),
				} as Timer<"PlainText", Extra>;
			});
	}
}
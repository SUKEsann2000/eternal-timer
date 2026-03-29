import { validate } from "uuid";

import type { Timer } from "../types.js";
import { TimersStore } from "./TimersStore.js";
import { throwMessage } from "src/throwMessage.js";

export class JSONLTimersStore<Extra extends object> extends TimersStore<"JSONL", Extra> {

	constructor(
		timerfile: string,
	) {
		super(timerfile);
	}

	/**
	 * checkTimerfileSyntax
	 * @description Checks the syntax of the timer file.
	 * @param timers Array of timer objects to check
	 * @returns void
	 * @throws If syntax is invalid
	 */
	protected override async checkTimerfileSyntax(timers: Timer<"JSONL", Extra>[]): Promise<void> {
		const throwing = () => {
			throw new Error(throwMessage.InvalidSyntax);
		};
		for (const timer of timers) {
			if (Object.keys(timer).length !== 4) throwing();
			if (Object.keys(timer).length !== 4) throwing();
			if (!timer.id || !validate(timer.id)) throwing();
			if (!timer.start || typeof timer.start !== "number") throwing();
			if (!timer.stop || typeof timer.stop !== "number") throwing();
			if (timer.start > timer.stop) throwing();
			if (!timer.extra || typeof timer.extra !== "object") throwing();
		}
	}

	public override toStringifyTimers(timers: Timer<"JSONL", Extra>[]): string {
		if (timers.length === 0) {
			return "";
		}
		return timers.map(t => JSON.stringify(t)).join("\n");
	}

	public override parseTimers(data: string): Timer<"JSONL", Extra>[] {
		return data
			.split(/\r?\n/)
			.filter((line) => line.trim())
			.map((line) => JSON.parse(line) as Timer<"JSONL", Extra>);
	}
}

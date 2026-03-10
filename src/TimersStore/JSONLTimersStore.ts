import type { Timer } from "../types.js";
import { TimersStore } from "./TimersStore.js";

export class JSONLTimersStore extends TimersStore<"JSONL"> {

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
	protected override async checkTimerfileSyntax(timers: Timer<"JSONL">[]): Promise<void> {
		const throwing = () => {
			throw new Error(`Timer file's syntax is wrong`);
		};
		for (const timer of timers) {
			if (!timer.id || typeof timer.id !== "string" || timer.id.length !== 36) throwing();
			if (!timer.start || typeof timer.start !== "number" || timer.start.toString().trim() === "") throwing();
			if (!timer.stop || typeof timer.stop !== "number" || timer.stop.toString().trim() === "") throwing();
			if (timer.start > timer.stop) throwing();
			if (timer.title && typeof timer.title !== "string") throwing();
			if (timer.description && typeof timer.description !== "string") throwing();
		}
	}

	public override toStringifyTimers(timers: Timer<"JSONL">[]): string {
		if (timers.length === 0) {
			return "";
		}
		return timers.map(t => JSON.stringify(t)).join("\n") + "\n";
	}

	public override parseTimers(data: string): Timer<"JSONL">[] {
		return data
			.split(/\r?\n/)
			.filter((line) => line.trim())
			.map((line) => JSON.parse(line) as Timer<"JSONL">);
	}
}
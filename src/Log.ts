import type { Logger } from "@logtape/logtape";

export class Log{
    private static logger: Logger | null = null;
    private static initPromise: Promise<void> | null = null;

    public static async ensureLogger() {
        if (Log.logger) return;
        if (!Log.initPromise) {
            Log.initPromise = (async () => {
                try {
                    const logtape = await import("@logtape/logtape");
                    Log.logger = logtape.getLogger(["eternal-timer"]);
                } catch {
                    console.info(
                        "Tip: Install the optional package '@logtape/logtape' to customize logging behavior.",
                    );
                }
            })();
        }
        await Log.initPromise;
    }

    public static get loggerInstance(): Logger | null {
        return Log.logger;
    }
}

/*
let logger: Logger | null = null;
let initPromise: Promise<void> | null = null;

export async function ensureLogger() {
	if (logger) return;
	if (!initPromise) {
		initPromise = (async () => {
			try {
				const logtape = await import("@logtape/logtape");
				logger = logtape.getLogger(["eternal-timer"]);
			} catch {
				console.info(
	  				"Tip: Install the optional package '@logtape/logtape' to customize logging behavior.",
				);
			}
		})();
	}
	await initPromise;
}
*/
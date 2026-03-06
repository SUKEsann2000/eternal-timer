const cjsModule = await import('./test.cjs');
const { cjs_test } = cjsModule.default;
import { module_test } from "./test.mjs";

import fs from "fs/promises";

async function main() {
	try {
		await fs.rm("./test/.timers.jsonl");
		await fs.rm("./test/.timers");
	} catch {}
	const cjs_result = await cjs_test();
	console.log();
	const module_result = await module_test();

	if (
		!cjs_result ||
        !module_result
	) {
		console.error("Oops! Something went wrong!");
		process.exit(1);
	}

	console.log("The test was passed.");
	process.exit(0);
}

main();
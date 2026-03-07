import fs from "fs/promises";

import cjs_module_exports from './test.cjs';
const { cjs_test } = cjs_module_exports;
import { module_test } from "./test.mjs";

async function main() {
	try {
		await fs.rm("./test/.timers.jsonl", { force: true });
		await fs.rm("./test/.timers", { force: true });
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
import fs from "fs/promises";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.resolve(path.dirname(__filename), "..");
const CJS_PACKAGE = path.join(__dirname, "./package.jsons/cjs_package.json");
const ESM_PACKAGE = path.join(__dirname, "./package.jsons/esm_package.json");

async function move() {
	// cjs
	await fs.copyFile(CJS_PACKAGE, path.join(__dirname, "./dist/cjs/package.json"));

	// module
	await fs.copyFile(ESM_PACKAGE, path.join(__dirname, "./dist/esm/package.json"));
}

await move();
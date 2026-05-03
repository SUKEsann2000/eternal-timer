import fs from "fs/promises";
import path from "path";

/**
 * searchRoot
 * @description searching root directly of the project
 * @returns directly of the project(string)
 */
export default async function searchRoot() {
	let dir = process.cwd();
	while (true) {
		try {
			await fs.access(path.join(dir, "package.json"));
			return dir;
		} catch {
			const parent = path.dirname(dir);
			if (parent === dir) break;
			dir = parent;
		}
	}
	return dir;
}
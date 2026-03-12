import fs from "fs";
import path from "path";

const baseDir = "dist/cjs/";
const subDirs = ["", "TimersManager", "TimersStore"];

for (const subDir of subDirs) {
	const dir = path.join(baseDir, subDir);
	const files = fs.readdirSync(dir);

	for (const file of files) {
		if (file.endsWith(".js")) {
			const oldPath = path.join(dir, file);
			const newFileName = file.slice(0, -3) + ".cjs";
			const newPath = path.join(dir, newFileName);

			fs.renameSync(oldPath, newPath);

			let content = fs.readFileSync(newPath, "utf-8");

			content = content.replace(/\.js\b/g, ".cjs");

			fs.writeFileSync(newPath, content, "utf-8");
		} else if (file.endsWith(".js.map")) {
			const oldPath = path.join(dir, file);
			const newFileName = file.replace(/\.js\.map$/, ".cjs.map");
			const newPath = path.join(dir, newFileName);

			fs.renameSync(oldPath, newPath);

			let content = fs.readFileSync(newPath, "utf-8");

			content = content.replace(/\.js\b/g, ".cjs");
			fs.writeFileSync(newPath, content, "utf-8");
		}
	}
}

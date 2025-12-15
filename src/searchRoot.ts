import fs from "fs";
import path from "path";

/**
 * searchRoot
 * @description searching root directly of the project
 * @returns directly of the project(string)
 */
export default function searchRoot() {
    let dir = process.cwd();
    while (!fs.existsSync(path.join(dir, "package.json"))) {
        const parent = path.dirname(dir);
        if (parent === dir) break;
            dir = parent;
    }
    return dir;
}
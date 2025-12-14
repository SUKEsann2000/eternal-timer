import fs from "fs";
import path from "path";

export default function searchRoot() {
    let dir = process.cwd();
    while (!fs.existsSync(path.join(dir, "package.json"))) {
        const parent = path.dirname(dir);
        if (parent === dir) break;
            dir = parent;
    }
    return dir;
}
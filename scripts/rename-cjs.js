import fs from "fs";
const files = fs.readdirSync("dist/cjs/")

for (const file of files) {
    if (file.endsWith(".js")) {
        const newName = file.slice(0, -3);
        fs.renameSync(`dist/cjs/${file}`, `dist/cjs/${newName}.cjs`)
    }
}
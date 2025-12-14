import fs from "fs";
import path from "path";
import searchRoot from "./searchRoot.js";
import { v4 as uuidv4 } from "uuid";
import type { Timer } from "types/timersData.ts";

// search root folder of project
const rootdir = searchRoot();
const timerfiledir = path.join(rootdir, ".timers");

async function createFile(): Promise<void> {
    if (!fs.existsSync(timerfiledir)) {
        fs.writeFile(timerfiledir, "", (data) => {
            console.log("The file was created in ", timerfiledir);
        });
    }
    return;
}

export async function createTimer(length: number): Promise<string | null> {
    try {
        await createFile();

        // uuid, start, end
        const id = uuidv4()
        const newTimerData = `${id} ${Date.now().toString()} ${(Date.now() + length).toString()}`;
        fs.appendFileSync(timerfiledir, newTimerData +  "\n");
        return id;
    } catch (e) {
        console.error(`Error when creating timer: ${e}`);
        return null;
    }
}

export async function removeTimer(id: string): Promise<boolean> {
    try {
        const timersRaw: string = fs.readFileSync(timerfiledir, "utf-8");
        const timersData: string[] = timersRaw.split(/\r?\n/);

        const filteredTimers = timersData.filter(line => line.split(" ")[0] !== id);

        fs.writeFileSync(timerfiledir, filteredTimers.join("\n"), "utf-8");

        return true;
    } catch (e) {
        console.error(`Error when removing timer: ${e}`);
        return false;
    }
}

export async function checkTimers(callback: (timer: Timer) => void, interval: number = 50) {
    try {
        await createFile();

        setInterval(() => {
            const timersData: string[] = fs.readFileSync(timerfiledir, "utf-8").split(/\r?\n/);
            const timersSet = new Set<Timer>();

            for (const timerData of timersData) {
                if (!timerData.trim()) continue;
                const [id, startStr, stopStr] = timerData.split(" ");
                timersSet.add({
                    id: id!,
                    start: startStr!,
                    stop: stopStr!
                });
            }

            const now = Date.now();
            for (const timer of timersSet) {
                if (Number(timer.stop) <= now) {
                    removeTimer(timer.id);
                    callback(timer);
                }
            }

        }, interval);

    } catch (e) {
        throw new Error(`Error when checking alarm: ${e}`);
    }
}

export async function showTimers(): Promise<Timer[]> {
    try {
        await createFile();
        const timersRaw: string = fs.readFileSync(timerfiledir, "utf-8");
        const timersData: string[] = timersRaw.split(/\r?\n/);

        let timersJSON: Timer[] = [];
        for (const timerData of timersData) {
            const splitedTimerData = timerData.split(" ")
            timersJSON.push({
                id: splitedTimerData[0]!,
                start: splitedTimerData[1]!,
                stop: splitedTimerData[2]!
            })
        }
        return timersJSON;
    } catch (e) {
        console.error(`Error when removing timer: ${e}`);
        return [];
    }
}
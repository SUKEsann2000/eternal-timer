import fs from "fs";
import path from "path";
import searchRoot from "./searchRoot.js";
import { v4 as uuidv4 } from "uuid";

export type Timer = {
    id: string,
    start: string,
    stop: string
}

// search root folder of project
const rootdir = searchRoot();
const timerfiledir = path.join(rootdir, ".timers");

/**
 * createFile
 * @description create `.timers` file
 * @returns void
 * @throws If file operation fails
 * @example
 * await createFile();
 */
async function createFile(): Promise<void> {
    if (!fs.existsSync(timerfiledir)) {
        fs.writeFile(timerfiledir, "", (data) => {
            console.log("The file was created in ", timerfiledir);
        });
    }
    return;
}

/**
 * createTimer
 * @description Creates a new timer.
 * @param length Timer duration in milliseconds
 * @returns Promise that resolves to the timer ID (UUID)
 * @throws If length is invalid(e.g. length < 0) or file operation fails
 * @example
 * const newTimer = await createTimer(5000);
 * // newTimer will be id of the timer
 */
export async function createTimer(length: number): Promise<string> {
    try {
        await createFile();
        
        if (length < 0) {
            throw new Error(`Invailed length: ${length}`);
        }

        length = Math.trunc(length);

        // uuid, start, end
        const id = uuidv4();
        const now = Date.now();
        const newTimerData = `${id} ${now.toString()} ${(now + length).toString()}`;
        await fs.promises.appendFile(timerfiledir, newTimerData + "\n");
        return id;
    } catch (e) {
        throw new Error(`Error when creating timer: ${e}`);
    }
}

/**
 * removeTimer
 * @description Removes a timer by ID.
 * @param id ID of the timer to remove
 * @returns void
 * @throws If file operation fails
 * @example
 * await removeTimer(id);
 */
export async function removeTimer(id: string): Promise<void> {
    try {
        const timersRaw: string = fs.readFileSync(timerfiledir, "utf-8");
        const timersData: string[] = timersRaw.split(/\r?\n/);
        
        let newTimersData: string = "";
        let found: boolean = false;
        for (const timerData of timersData) {
            if (!timerData.trim()) {
                found = true;
                continue;
            }
            const [timerId] = timerData.split(" ");
            if (timerId !== id) {
                newTimersData += timerData + "\n";
            }
        }
        if (!found) {
            throw new Error(`Timer with id ${id} not found`);
        }
        await fs.promises.writeFile(timerfiledir, newTimersData, "utf-8");
        return;
    } catch (e) {
        throw new Error(`Error when removing timer: ${e}`);
    }
}

/**
 * @description Starts monitoring expired timers asynchronously and returns immediately. The callback is invoked asynchronously when a timer expires.
 * @param callback Function invoked when an expired timer is detected (called asynchronously)
 * @param interval (number, optional): Check interval in milliseconds (default: 50ms)
 * @throws If file operation fails
 * @example
 * checkTimers((timer) => {
 *     console.log(`A timer was stopped: ${timer.id}`);
 * });
 */
export async function checkTimers(callback: (timer: Timer) => void, interval: number = 50): Promise<void> {
    try {
        await createFile();

        setInterval(() => {
            const timersDataRaw: string = fs.readFileSync(timerfiledir, "utf-8");
            const timersData: string[] = timersDataRaw.split(/\r?\n/);
            const timersSet = new Set<Timer>();
            checkTimerfileSyntax(timersDataRaw);

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

/**
 * showTimers
 * @description Retrieves all active timers.
 * @returns Array of `Timer` objects
 * @throws If file operation fails
 * @example
 * const timers = await showTimers();
 * console.log(JSON.stringify(timers))
 */
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
        throw new Error(`Error when showing timers: ${e}`)
    }
}

/**
 * getRemainingTimer
 * @description Retrieves the remaining time of a timer by ID.
 * @param id timer's id you want to get remaining time(ms)
 * @returns Remaining time of the timer(ms)
 * @throws If timer with the specified ID is not found or file operation fails
 * @example
 * const remaining: number = await getRemainingTimer(id);
 * console.log(`Remaining time: ${remaining} ms`);
 */
export async function getRemainingTimer(id: string): Promise<number> {
    try {
        const timersRaw: string = fs.readFileSync(timerfiledir, "utf-8");
        const timersData: string[] = timersRaw.split(/\r?\n/);
        for (const timerData of timersData) {
            const splitedTimerData = timerData.split(" ")
            if (splitedTimerData[0] === id) {
                const now = Date.now();
                const stop = Number(splitedTimerData[2]);
                return Math.max(0, stop - now);
            }
        }
        throw new Error(`Timer with id ${id} not found`);
    } catch (e) {
        throw new Error(`Error when getting remaining timer: ${e}`);
    }
}

async function checkTimerfileSyntax(fileData: string): Promise<void> {
    const throwing = () => {
        throw new Error(`Timer file's syntax is wrong`);
    };
    const timersData = fileData
        .split('\n')
        .map(l => l.trim())
        .filter(l => l !== "");
    for (const timerData of timersData) {
        const timerArray: string[] = timerData.split(/\s+/);
        if (timerArray.length !== 3) throwing();
        if (timerArray[0]?.length !== 36) throwing();
        if (timerArray[1]!.trim() === "") throwing();
        if (timerArray[2]!.trim() === "") throwing();
    }
    return;
}
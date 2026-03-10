import { JSONLTimersManager, PlainTextTimersManager } from 'eternal-timer';

export async function module_test() {
	const runTest = async(isJSONL) => {
		const manager = isJSONL ? new JSONLTimersManager("test/.timers.jsonl") : new PlainTextTimersManager("test/.timers");

		const timer1 = isJSONL ? await manager.createTimer({length: 1000, title: "TestTimer1", description: "This is test1"}) : await manager.createTimer(1000);
		const timer2 = isJSONL ? await manager.createTimer({length: 1500, title: "TestTimer2", description: "This is test2"}) : await manager.createTimer(1500);
	
		const timersAfterCreate = await manager.showTimers();
	
		if (
			timersAfterCreate.some(t => t.id === timer1) &&
			timersAfterCreate.some(t => t.id === timer2)
		) {
			console.log("✅ Creating Timer OK");
		} else {
			console.log("❌ Creating Timer Failed");
			return false;
		}
	
		const finishedTimers = [];
		const interval = await manager.checkTimers(async (timer) => {
			finishedTimers.push(timer.id);
		});
		await new Promise(resolve => setTimeout(resolve, 2000));

		clearInterval(interval);

		if (finishedTimers.includes(timer1) && finishedTimers.includes(timer2) && finishedTimers.length === 2) {
			console.log("✅ Callback of Timer OK");
		} else {
			console.log("❌ Callback of Timer Failed");
			return false;
		}
	
		const timer3 = await manager.createTimer(5000);
	
		await manager.removeTimer(timer3);
		const timersAfterRemove = await manager.showTimers();
	
		if (timersAfterRemove.length === 0) {
			console.log("✅ Remove Timer OK");
		} else {
			console.log("❌ Remove Timer failed");
			return false;
		}

		const timer4 = await manager.createTimer(10000);
		await manager.adjustRemainingTime(timer4, -9500);

		let adjustedTimerFinished = false;
		const adjustInterval = await manager.checkTimers(async (timer) => {
			if (timer.id === timer4) {
				adjustedTimerFinished = true;
			}
		});
		await new Promise(resolve => setTimeout(resolve, 1000));
		clearInterval(adjustInterval);

		if (adjustedTimerFinished) {
			console.log("✅ Adjust Remaining Time OK");
		} else {
			console.log("❌ Adjust Remaining Time Failed");
			return false;
		}

		return true;
	};

	let overallResult = true;
	console.log("=== MODULE_TEST ===");
	if (!(await runTest(true))) {
		overallResult = false;
	}
	console.log();
	if (!(await runTest(false))) {
		overallResult = false;
	}
	console.log("=== MODULE_TEST END ===");
	return overallResult;
}

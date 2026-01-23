import { JSONLTimersManager, PlainTextTimersManager } from 'eternal-timer';

export async function module_test() {
	const runTest = async(isJSONL) => {
		const manager = isJSONL ? new JSONLTimersManager("test/.timers.jsonl") : new PlainTextTimersManager("test/.timers");

		const timer1 = isJSONL ? await manager.createTimer(1000, "TestTimer1", "This is test1") : await manager.createTimer(1000);
		const timer2 = isJSONL ? await manager.createTimer(1500, "TestTimer2", "This is test2") : await manager.createTimer(1500);
	
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
		const interval = manager.checkTimers(async (timer) => {
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
			console.log("❌ Delete Timer failed");
			return false;
		}
	};

	console.log("=== MODULE_TEST ===");
	await runTest(true);
	console.log();
	await runTest(false);
	console.log("=== MODULE_TEST END ===");
	return true;
}


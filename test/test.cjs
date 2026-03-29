const { JSONLTimersManager, PlainTextTimersManager } = require("eternal-timer");

async function cjs_test() {
	const runTest = async(isJSONL) => {
		const manager = isJSONL ? new JSONLTimersManager("test/.timers.jsonl") : new PlainTextTimersManager("test/.timers");

		const timer1 = isJSONL ? await manager.createTimer({ length: 1000, extra: { title: "TestTimer1" , description: "This is test1" } }) : await manager.createTimer(1000);
		const timer2 = isJSONL ? await manager.createTimer({ length: 1500, extra: { title: "TestTimer2", description: "This is test2" } }) : await manager.createTimer(1500);
	
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
		const expiredListener = (timer) => {
			finishedTimers.push(timer.id);
		};
		manager.on("expired", expiredListener);
		const checkInterval = await manager.checkStart(100);
		await new Promise(resolve => setTimeout(resolve, 2000));
		clearInterval(checkInterval);
		manager.off("expired", expiredListener);

		if (finishedTimers.includes(timer1) && finishedTimers.includes(timer2) && finishedTimers.length === 2) {
			console.log("✅ Callback of Timer OK");
		} else {
			console.log("❌ Callback of Timer Failed");
			return false;
		}
	

		const timer3 = isJSONL ? await manager.createTimer({ length: 5000, extra: { title: "TestTimer3" } }) : await manager.createTimer(5000);
	
		await manager.removeTimer(timer3);
		const timersAfterRemove = await manager.showTimers();
		if (timersAfterRemove.length === 0) {
			console.log("✅ Remove Timer OK");
		} else {
			console.log("❌ Remove Timer failed");
			return false;
		}

		const timer4 = isJSONL ? await manager.createTimer({ length: 10000, extra: { title: "TestTimer4" } }) : await manager.createTimer(10000);
		
		let updatedEventTriggered = false;
		const updatedListener = (updatedTimer) => {
			if (updatedTimer.id === timer4) {
				updatedEventTriggered = true;
			}
		};
		manager.on("updated", updatedListener);

		await manager.adjustRemainingTime(timer4, -9500);
		manager.off("updated", updatedListener);
		if (!updatedEventTriggered) {
			console.log("❌ Adjust Remaining Time Failed");
			return false;
		} else {
			console.log("✅ Adjust Remaining Time OK");
		}

		let adjustedTimerFinished = false;
		const expiredListenerForAdjust = (timer) => {
			if (timer.id === timer4) {
				adjustedTimerFinished = true;
			}
		};
		manager.on("expired", expiredListenerForAdjust);
		const adjustInterval = await manager.checkStart(100);
		await new Promise(resolve => setTimeout(resolve, 1000));
		clearInterval(adjustInterval);
		manager.off("expired", expiredListenerForAdjust);

		if (adjustedTimerFinished) {
			console.log("✅ Adjust Remaining Time OK");
		} else {
			console.log("❌ Adjust Remaining Time Failed");
			return false;
		}

		if (isJSONL) {
			const timer5 = await manager.createTimer({ length: 5000, extra: { title: "TestTitle1", description: "TestDescription1" } });

			await manager.changeExtra(timer5, { title: "TestTitle2", description: "TestDescription2" });

			const changedTimers = await manager.showTimers();
			if (changedTimers.find(t => t.id === timer5).extra.title === "TestTitle2") {
				console.log("✅ Change Title OK");
			} else {
				console.log("❌ Change Title Failed");
				return false;
			}

			if (changedTimers.find(t => t.id === timer5).extra.description === "TestDescription2") {
				console.log("✅ Change Description OK");
			} else {
				console.log("❌ Change Description Failed");
				return false;
			}

			await manager.removeTimer(timer5);
		}

		return true;
	};

	let overallResult = true;
	console.log("=== COMMONJS_TEST ===");
	if (!(await runTest(true))) {
		overallResult = false;
	}
	console.log();
	if (!(await runTest(false))) {
		overallResult = false;
	}
	console.log("=== COMMONJS_TEST END ===");
	return overallResult;
}

module.exports = {
	cjs_test,
};

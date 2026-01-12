const { TimersManager } = require("eternal-timer");

async function cjs_test() {
	const manager = new TimersManager("test/.timers");

	console.log("=== COMMONJS_TEST ===");

	const timer1 = await manager.createTimer(1000);
	const timer2 = await manager.createTimer(1500);

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
	manager.checkTimers(async (timer) => {
		finishedTimers.push(timer.id);
	});
	await new Promise(resolve => setTimeout(resolve, 2000));

	if (finishedTimers.includes(timer1) && finishedTimers.includes(timer2)) {
		console.log("✅ Callback of Timer OK");
	} else {
		console.log("❌ Callback of Timer Failed");
		return false;
	}

	const timer3 = await manager.createTimer(5000);

	await manager.removeTimer(timer3);
	const timersAfterRemove = await manager.showTimers();

	if (!timersAfterRemove.some(t => t.id === timer3)) {
		console.log("✅ Remove Timer OK");
	} else {
		console.log("❌ Delete Timer failed");
		return false;
	}

	console.log("=== COMMONJS_TEST END ===");
	return true;
}

module.exports = {
	cjs_test,
};
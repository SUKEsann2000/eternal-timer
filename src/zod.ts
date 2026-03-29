export class TimerZod {
	private static zod: typeof import("zod") | null = null;
	private static initPromise: Promise<void> | null = null;

	public static async ensureZod() {
		if (this.zod) return;

		if (!this.initPromise) {
			this.initPromise = (async () => {
				try {
					this.zod = await import("zod");
				} catch {
					console.info(
						"Tip: Install 'zod' to enable schema validation.",
					);
				}
			})();
		}

		await this.initPromise;
	}

	public static get instance(): typeof import("zod") | null {
		return this.zod;
	}
}

type TimeoutOptions = {
	timeoutMs: number;
	timeoutMessage?: string;
	onTimeout?: () => void;
};

/**
 * Wraps an async task factory with a timeout so callers can fail fast without
 * hanging on slow upstream providers (e.g., OpenRouter).
 */
export function withTimeout<T>(
	taskFactory: () => Promise<T>,
	{ timeoutMs, timeoutMessage, onTimeout }: TimeoutOptions,
): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		let settled = false;

		const clearAndResolve = (value: T) => {
			if (settled) return;
			settled = true;
			clearTimeout(timeoutHandle);
			resolve(value);
		};

		const clearAndReject = (error: unknown) => {
			if (settled) return;
			settled = true;
			clearTimeout(timeoutHandle);
			reject(error);
		};

		const timeoutHandle = setTimeout(() => {
			if (settled) return;
			settled = true;
			onTimeout?.();
			reject(
				new Error(
					timeoutMessage ?? `Operation timed out after ${timeoutMs}ms.`,
				),
			);
		}, timeoutMs);

		try {
			const taskPromise = taskFactory();
			taskPromise.then(clearAndResolve).catch(clearAndReject);
		} catch (error) {
			clearAndReject(error);
			return;
		}
	});
}

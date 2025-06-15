export async function fetchWithRetry(
	url: string,
	init?: RequestInit,
	retries = 3,
	backoffMs = 500,
): Promise<Response> {
	let attempt = 0;
	let delay = backoffMs;
	while (attempt <= retries) {
		try {
			const res = await fetch(url, init);
			if (res.status >= 500 && attempt < retries) {
				throw new Error(`Server responded with ${res.status}`);
			}
			return res;
		} catch (err) {
			attempt += 1;
			console.error(
				`[BAML] Fetch failed (attempt ${attempt}/${retries}): ${err instanceof Error ? err.message : String(err)}`,
			);
			if (attempt > retries) throw err;
			await new Promise((r) => setTimeout(r, delay));
			delay *= 2;
		}
	}
	throw new Error("Failed to fetch");
}

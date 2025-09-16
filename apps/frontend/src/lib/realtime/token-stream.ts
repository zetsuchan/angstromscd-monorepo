import type {
	RealtimeEnvelope,
	TokenStreamEvent,
} from "@angstromscd/shared-types";

export interface TokenStreamOptions {
	baseUrl: string;
	onToken: (event: RealtimeEnvelope<TokenStreamEvent>) => void;
	onLifecycle?: (event: MessageEvent) => void;
	onError?: (error: Event) => void;
}

export class TokenStreamClient {
	private source: EventSource | null = null;
	private readonly options: TokenStreamOptions;

	constructor(options: TokenStreamOptions) {
		this.options = options;
	}

	subscribe(conversationId: string) {
		this.close();
		const url = `${this.options.baseUrl.replace(/\/$/, "")}/stream/${conversationId}`;
		this.source = new EventSource(url, { withCredentials: true });

		this.source.addEventListener("token", (event) => {
			const data = safeParse(event);
			if (!data) return;
			this.options.onToken(data as RealtimeEnvelope<TokenStreamEvent>);
		});

		if (this.options.onLifecycle) {
			this.source.addEventListener("event", this.options.onLifecycle);
		}

		this.source.addEventListener("error", (event) => {
			this.options.onError?.(event);
		});
	}

	close() {
		this.source?.close();
		this.source = null;
	}
}

function safeParse(event: MessageEvent): unknown {
	try {
		return JSON.parse(event.data);
	} catch (error) {
		console.error("Failed to parse SSE payload", { data: event.data, error });
		return undefined;
	}
}

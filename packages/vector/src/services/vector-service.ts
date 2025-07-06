import type { VectorProvider } from "../interfaces/vector-provider.interface";
import { VectorProviderFactory } from "./vector-provider-factory";

export class VectorService {
	private provider: VectorProvider | null = null;

	async initialize(): Promise<void> {
		const config = VectorProviderFactory.getProviderFromEnv();
		this.provider = await VectorProviderFactory.create(config);
		await this.provider.initialize();

		console.log(`Vector service initialized with ${config.provider} provider`);
	}

	private getProvider(): VectorProvider {
		if (!this.provider) {
			throw new Error(
				"Vector service not initialized. Call initialize() first.",
			);
		}
		return this.provider;
	}

	async createCollection(name: string, dimension?: number) {
		return await this.getProvider().createCollection(name, dimension);
	}

	async listCollections() {
		return await this.getProvider().listCollections();
	}

	async addDocuments(options: {
		collection: string;
		documents: string[];
		ids: string[];
		metadatas?: Array<Record<string, unknown>>;
	}) {
		return await this.getProvider().addDocuments(options);
	}

	async query(options: {
		collection: string;
		query: string;
		nResults?: number;
	}) {
		return await this.getProvider().query(options);
	}

	async similar(options: {
		collection: string;
		document: string;
		nResults?: number;
	}) {
		return await this.getProvider().similar(options);
	}

	async deleteDocuments(options: {
		collection: string;
		ids: string[];
	}) {
		const provider = this.getProvider();
		if (provider.deleteDocuments) {
			return await provider.deleteDocuments(options);
		}
		throw new Error("Delete documents not supported by current provider");
	}

	async deleteCollection(name: string) {
		return await this.getProvider().deleteCollection(name);
	}
}

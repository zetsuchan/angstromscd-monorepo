export interface PatientInfo {
	id: string;
	name?: string;
	age?: number;
	gender?: string;
	diagnosis?: string;
	[key: string]: unknown;
}

/**
 * Lightweight holder for context shared across a demo CLI session.
 * Additional fields can be attached ad-hoc via the `extras` map.
 */
export class MedicalContext {
	constructor(
		public patient: PatientInfo,
		public sessionId = `session-${Date.now()}`,
		public extras: Record<string, unknown> = {},
	) {}

	updatePatient(newInfo: Partial<PatientInfo>): void {
		this.patient = { ...this.patient, ...newInfo };
	}

	set(key: string, value: unknown): void {
		this.extras[key] = value;
	}

	get<T = unknown>(key: string): T | undefined {
		return this.extras[key] as T | undefined;
	}
}

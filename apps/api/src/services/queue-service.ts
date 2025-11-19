import { MedicalQueueService } from "@angstromscd/queue";

let queueService: MedicalQueueService | null = null;

export function getQueueService(): MedicalQueueService {
	if (!queueService) {
		queueService = new MedicalQueueService({
			host: process.env.POSTGRES_HOST || "localhost",
			port: Number.parseInt(process.env.POSTGRES_PORT || "5432"),
			database: process.env.POSTGRES_DB || "angstromscd",
			username: process.env.POSTGRES_USER || "postgres",
			password: process.env.POSTGRES_PASSWORD || "password",
		});
	}
	return queueService;
}

export async function processVOEAlert(
	patientId: string,
	riskLevel: "low" | "medium" | "high",
	details?: any,
) {
	const queue = getQueueService();
	const msgId = await queue.sendVOEAlert(patientId, riskLevel, details);
	console.log(
		`VOE alert sent for patient ${patientId} with message ID: ${msgId}`,
	);
	return msgId;
}

export async function scheduleMedicationReminder(
	patientId: string,
	medication: string,
	dosage: string,
	time: Date,
) {
	const queue = getQueueService();
	const msgId = await queue.sendMedicationReminder(
		patientId,
		medication,
		dosage,
		time,
	);
	console.log(
		`Medication reminder scheduled for patient ${patientId} with message ID: ${msgId}`,
	);
	return msgId;
}

export async function notifyLabResults(
	patientId: string,
	labType: string,
	results: any,
	abnormal: boolean,
) {
	const queue = getQueueService();
	const msgId = await queue.sendLabResultNotification(
		patientId,
		labType,
		results,
		abnormal,
	);
	console.log(
		`Lab result notification sent for patient ${patientId} with message ID: ${msgId}`,
	);
	return msgId;
}

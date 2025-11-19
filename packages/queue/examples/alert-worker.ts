#!/usr/bin/env bun
/**
 * Alert Worker - Processes medical alerts from the queue
 * This would typically run as a separate service
 */

import { MedicalQueueService, Message } from "../src/index";

interface VOEAlert {
	patientId: string;
	riskLevel: "low" | "medium" | "high";
	timestamp: string;
	details?: {
		hemoglobin?: number;
		oxygenSaturation?: number;
		painLevel?: number;
		symptoms?: string[];
		vitals?: any;
	};
}

interface MedicationReminder {
	patientId: string;
	medication: string;
	dosage: string;
	scheduledTime: string;
	createdAt: string;
}

class AlertWorker {
	private queue: MedicalQueueService;
	private running = false;

	constructor() {
		this.queue = new MedicalQueueService({
			host: process.env.POSTGRES_HOST || "localhost",
			port: Number.parseInt(process.env.POSTGRES_PORT || "5432"),
			database: process.env.POSTGRES_DB || "angstromscd",
			username: process.env.POSTGRES_USER || "postgres",
			password: process.env.POSTGRES_PASSWORD || "password",
		});
	}

	async start() {
		this.running = true;
		console.log("🚀 Alert Worker started");
		console.log("   Polling for messages every 5 seconds...\n");

		while (this.running) {
			try {
				await this.processVOEAlerts();
				await this.processMedicationReminders();
				await this.processLabResults();
			} catch (error) {
				console.error("❌ Worker error:", error);
			}

			// Wait 5 seconds before next poll
			await new Promise((resolve) => setTimeout(resolve, 5000));
		}
	}

	async stop() {
		console.log("\n🛑 Stopping worker...");
		this.running = false;
		await this.queue.close();
		console.log("👋 Worker stopped");
	}

	private async processVOEAlerts() {
		const alerts = await this.queue.readVOEAlerts(10);

		for (const alert of alerts) {
			const voeData = alert.message as VOEAlert;
			console.log(`\n🚨 Processing VOE Alert (ID: ${alert.msg_id})`);
			console.log(`   Patient: ${voeData.patientId}`);
			console.log(`   Risk Level: ${voeData.riskLevel}`);

			try {
				// Simulate processing the alert
				await this.handleVOEAlert(voeData);

				// Delete the message after successful processing
				await this.queue.delete("voe_alerts", alert.msg_id);
				console.log(`   ✅ Alert processed and removed from queue`);
			} catch (error) {
				console.error(`   ❌ Failed to process alert:`, error);
				// Message will become visible again after visibility timeout
			}
		}
	}

	private async processMedicationReminders() {
		const reminders = await this.queue.readMedicationReminders(10);

		for (const reminder of reminders) {
			const reminderData = reminder.message as MedicationReminder;
			const scheduledTime = new Date(reminderData.scheduledTime);
			const now = new Date();

			// Only process if it's time for the reminder
			if (scheduledTime <= now) {
				console.log(
					`\n💊 Processing Medication Reminder (ID: ${reminder.msg_id})`,
				);
				console.log(`   Patient: ${reminderData.patientId}`);
				console.log(
					`   Medication: ${reminderData.medication} ${reminderData.dosage}`,
				);

				try {
					await this.sendMedicationNotification(reminderData);
					await this.queue.delete("medication_reminders", reminder.msg_id);
					console.log(`   ✅ Reminder sent and removed from queue`);
				} catch (error) {
					console.error(`   ❌ Failed to send reminder:`, error);
				}
			}
		}
	}

	private async processLabResults() {
		const results = await this.queue.readLabResultNotifications(10);

		for (const result of results) {
			const labData = result.message;
			console.log(`\n🔬 Processing Lab Result (ID: ${result.msg_id})`);
			console.log(`   Patient: ${labData.patientId}`);
			console.log(`   Type: ${labData.labType}`);
			console.log(`   Abnormal: ${labData.abnormal ? "Yes" : "No"}`);

			try {
				if (labData.abnormal) {
					await this.notifyClinician(labData);
				}

				// Archive lab results instead of deleting
				await this.queue.archive("lab_result_notifications", result.msg_id);
				console.log(`   ✅ Lab result processed and archived`);
			} catch (error) {
				console.error(`   ❌ Failed to process lab result:`, error);
			}
		}
	}

	private async handleVOEAlert(alert: VOEAlert) {
		// Simulate alert handling logic
		console.log(`   🏥 Handling VOE alert...`);

		if (alert.riskLevel === "high") {
			console.log(`   📱 Notifying on-call physician...`);
			console.log(`   🚑 Preparing emergency protocol...`);
		} else if (alert.riskLevel === "medium") {
			console.log(`   📧 Sending alert to care team...`);
		}

		// Log to audit queue
		await this.queue.send("medical_audit_log", {
			type: "voe_alert_processed",
			patientId: alert.patientId,
			riskLevel: alert.riskLevel,
			processedAt: new Date().toISOString(),
		});
	}

	private async sendMedicationNotification(reminder: MedicationReminder) {
		// Simulate sending notification
		console.log(`   📱 Sending push notification...`);
		console.log(`   📧 Sending email reminder...`);

		// Log to audit queue
		await this.queue.send("medical_audit_log", {
			type: "medication_reminder_sent",
			patientId: reminder.patientId,
			medication: reminder.medication,
			sentAt: new Date().toISOString(),
		});
	}

	private async notifyClinician(labResult: any) {
		// Simulate clinician notification
		console.log(`   👨‍⚕️ Notifying clinician about abnormal results...`);
		console.log(`   📊 Generating result summary...`);

		// Log to audit queue
		await this.queue.send("medical_audit_log", {
			type: "abnormal_lab_notification",
			patientId: labResult.patientId,
			labType: labResult.labType,
			notifiedAt: new Date().toISOString(),
		});
	}
}

// Start the worker
const worker = new AlertWorker();

// Handle graceful shutdown
process.on("SIGINT", async () => {
	await worker.stop();
	process.exit(0);
});

process.on("SIGTERM", async () => {
	await worker.stop();
	process.exit(0);
});

// Start processing
worker.start().catch(console.error);

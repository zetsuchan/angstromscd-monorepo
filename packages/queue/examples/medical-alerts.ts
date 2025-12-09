#!/usr/bin/env bun
/**
 * Example: Medical Alert Queue Usage
 * This demonstrates how to use PGMQ for various medical alert scenarios
 */

import { MedicalQueueService } from "../src/index";

async function runExamples() {
	// Initialize the queue service
	const queue = new MedicalQueueService({
		host: "localhost",
		port: 5432,
		database: "angstromscd",
		username: "postgres",
		password: "password",
	});

	console.log("🏥 Medical Alert Queue Examples\n");

	try {
		// Example 1: High-risk VOE Alert
		console.log("1️⃣  Sending high-risk VOE alert...");
		const voeAlertId = await queue.sendVOEAlert("patient-123", "high", {
			hemoglobin: 6.5,
			oxygenSaturation: 88,
			painLevel: 8,
			symptoms: ["chest pain", "shortness of breath", "fever"],
			vitals: {
				bloodPressure: "140/90",
				heartRate: 110,
				temperature: 38.5,
			},
		});
		console.log(`✅ VOE alert sent with ID: ${voeAlertId}\n`);

		// Example 2: Medication Reminder
		console.log("2️⃣  Scheduling medication reminder...");
		const reminderTime = new Date();
		reminderTime.setHours(reminderTime.getHours() + 4); // 4 hours from now

		const medicationId = await queue.sendMedicationReminder(
			"patient-456",
			"Hydroxyurea",
			"500mg",
			reminderTime,
		);
		console.log(`✅ Medication reminder scheduled with ID: ${medicationId}`);
		console.log(`   Scheduled for: ${reminderTime.toLocaleString()}\n`);

		// Example 3: Abnormal Lab Results
		console.log("3️⃣  Sending abnormal lab result notification...");
		const labResultId = await queue.sendLabResultNotification(
			"patient-789",
			"Complete Blood Count",
			{
				hemoglobin: 7.2,
				hematocrit: 21.5,
				whiteBloodCells: 15000,
				platelets: 450000,
				reticulocytes: 18.5,
			},
			true, // abnormal flag
		);
		console.log(`✅ Lab result notification sent with ID: ${labResultId}\n`);

		// Example 4: Reading pending alerts
		console.log("4️⃣  Reading pending alerts...\n");

		console.log("VOE Alerts:");
		const voeAlerts = await queue.readVOEAlerts(5);
		for (const alert of voeAlerts) {
			console.log(`  - ID: ${alert.msg_id}`);
			console.log(`    Patient: ${alert.message.patientId}`);
			console.log(`    Risk Level: ${alert.message.riskLevel}`);
			console.log(`    Enqueued: ${alert.enqueued_at}\n`);
		}

		console.log("Medication Reminders:");
		const reminders = await queue.readMedicationReminders(5);
		for (const reminder of reminders) {
			console.log(`  - ID: ${reminder.msg_id}`);
			console.log(`    Patient: ${reminder.message.patientId}`);
			console.log(
				`    Medication: ${reminder.message.medication} ${reminder.message.dosage}`,
			);
			console.log(`    Scheduled: ${reminder.message.scheduledTime}\n`);
		}

		// Example 5: Processing alerts (pop from queue)
		console.log("5️⃣  Processing a VOE alert...");
		const processedAlert = await queue.pop("voe_alerts");
		if (processedAlert) {
			console.log(`✅ Processed alert ID: ${processedAlert.msg_id}`);
			console.log(`   Patient: ${processedAlert.message.patientId}`);
			console.log("   This alert has been removed from the queue\n");
		} else {
			console.log("   No alerts to process\n");
		}

		// Example 6: Archiving processed messages
		if (voeAlerts.length > 0) {
			console.log("6️⃣  Archiving a processed message...");
			const archived = await queue.archive("voe_alerts", voeAlerts[0].msg_id);
			console.log(`✅ Message archived: ${archived}\n`);
		}
	} catch (error) {
		console.error("❌ Error:", error);
	} finally {
		// Clean up connection
		await queue.close();
		console.log("👋 Queue connection closed");
	}
}

// Run the examples
console.log("Starting Medical Alert Queue Examples...\n");
runExamples().catch(console.error);

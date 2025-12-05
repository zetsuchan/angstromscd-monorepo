import { Hono } from "hono";
import { z } from "zod";
import {
	getQueueService,
	notifyLabResults,
	processVOEAlert,
	scheduleMedicationReminder,
} from "../services/queue-service";

const queueRoutes = new Hono();

// VOE Alert Schema
const voeAlertSchema = z.object({
	patientId: z.string(),
	riskLevel: z.enum(["low", "medium", "high"]),
	details: z
		.object({
			hemoglobin: z.number().optional(),
			oxygenSaturation: z.number().optional(),
			painLevel: z.number().min(0).max(10).optional(),
			symptoms: z.array(z.string()).optional(),
		})
		.optional(),
});

// Medication Reminder Schema
const medicationReminderSchema = z.object({
	patientId: z.string(),
	medication: z.string(),
	dosage: z.string(),
	scheduledTime: z.string().datetime(),
});

// Lab Result Schema
const labResultSchema = z.object({
	patientId: z.string(),
	labType: z.string(),
	results: z.record(z.any()),
	abnormal: z.boolean(),
});

// Send VOE Alert
queueRoutes.post("/voe-alert", async (c) => {
	try {
		const body = await c.req.json();
		const data = voeAlertSchema.parse(body);

		const msgId = await processVOEAlert(
			data.patientId,
			data.riskLevel,
			data.details,
		);

		return c.json({
			success: true,
			messageId: msgId.toString(),
			message: "VOE alert queued successfully",
		});
	} catch (error) {
		if (error instanceof z.ZodError) {
			return c.json(
				{ error: "Invalid request data", details: error.errors },
				400,
			);
		}
		return c.json({ error: "Failed to queue VOE alert" }, 500);
	}
});

// Schedule Medication Reminder
queueRoutes.post("/medication-reminder", async (c) => {
	try {
		const body = await c.req.json();
		const data = medicationReminderSchema.parse(body);

		const msgId = await scheduleMedicationReminder(
			data.patientId,
			data.medication,
			data.dosage,
			new Date(data.scheduledTime),
		);

		return c.json({
			success: true,
			messageId: msgId.toString(),
			message: "Medication reminder scheduled successfully",
		});
	} catch (error) {
		if (error instanceof z.ZodError) {
			return c.json(
				{ error: "Invalid request data", details: error.errors },
				400,
			);
		}
		return c.json({ error: "Failed to schedule medication reminder" }, 500);
	}
});

// Send Lab Result Notification
queueRoutes.post("/lab-result", async (c) => {
	try {
		const body = await c.req.json();
		const data = labResultSchema.parse(body);

		const msgId = await notifyLabResults(
			data.patientId,
			data.labType,
			data.results,
			data.abnormal,
		);

		return c.json({
			success: true,
			messageId: msgId.toString(),
			message: "Lab result notification queued successfully",
		});
	} catch (error) {
		if (error instanceof z.ZodError) {
			return c.json(
				{ error: "Invalid request data", details: error.errors },
				400,
			);
		}
		return c.json({ error: "Failed to queue lab result notification" }, 500);
	}
});

// Get pending alerts (for monitoring/dashboard)
queueRoutes.get("/alerts/:type", async (c) => {
	try {
		const alertType = c.req.param("type");
		const limit = Number.parseInt(c.req.query("limit") || "10");

		const queue = getQueueService();
		let messages: Awaited<ReturnType<typeof queue.readVOEAlerts>>;

		switch (alertType) {
			case "voe":
				messages = await queue.readVOEAlerts(limit);
				break;
			case "medication":
				messages = await queue.readMedicationReminders(limit);
				break;
			case "lab":
				messages = await queue.readLabResultNotifications(limit);
				break;
			default:
				return c.json({ error: "Invalid alert type" }, 400);
		}

		return c.json({
			success: true,
			alerts: messages.map((msg) => ({
				id: msg.msg_id.toString(),
				data: msg.message,
				enqueuedAt: msg.enqueued_at,
				readCount: msg.read_ct,
			})),
		});
	} catch (error) {
		return c.json({ error: "Failed to retrieve alerts" }, 500);
	}
});

export default queueRoutes;

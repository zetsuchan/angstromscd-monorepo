import postgres from 'postgres';

export interface QueueConfig {
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
}

export interface Message<T = any> {
  msg_id: bigint;
  read_ct: number;
  enqueued_at: Date;
  vt: Date;
  message: T;
}

export class PGMQClient {
  private sql: postgres.Sql;

  constructor(config: QueueConfig) {
    this.sql = postgres(config.connectionString || {
      host: config.host || 'localhost',
      port: config.port || 5432,
      database: config.database || 'angstromscd',
      username: config.username || 'postgres',
      password: config.password || 'password',
    });
  }

  async createQueue(queueName: string): Promise<void> {
    await this.sql`SELECT pgmq.create(${queueName})`;
  }

  async send<T>(queueName: string, message: T, delay?: number): Promise<bigint> {
    const result = await this.sql`
      SELECT * FROM pgmq.send(
        queue_name => ${queueName},
        msg => ${JSON.stringify(message)}::jsonb,
        delay => ${delay || 0}
      )
    `;
    return result[0].send;
  }

  async sendBatch<T>(queueName: string, messages: T[]): Promise<bigint[]> {
    const jsonMessages = messages.map(m => JSON.stringify(m));
    const result = await this.sql`
      SELECT * FROM pgmq.send_batch(
        queue_name => ${queueName},
        msgs => ARRAY[${this.sql(jsonMessages)}]::jsonb[]
      )
    `;
    return result.map(r => r.send_batch);
  }

  async read<T>(queueName: string, vt: number = 30, qty: number = 1): Promise<Message<T>[]> {
    const result = await this.sql`
      SELECT * FROM pgmq.read(
        queue_name => ${queueName},
        vt => ${vt},
        qty => ${qty}
      )
    `;
    return result.map(r => ({
      msg_id: r.msg_id,
      read_ct: r.read_ct,
      enqueued_at: r.enqueued_at,
      vt: r.vt,
      message: r.message,
    }));
  }

  async pop<T>(queueName: string): Promise<Message<T> | null> {
    const result = await this.sql`
      SELECT * FROM pgmq.pop(${queueName})
    `;
    if (result.length === 0) return null;
    const r = result[0];
    return {
      msg_id: r.msg_id,
      read_ct: r.read_ct,
      enqueued_at: r.enqueued_at,
      vt: r.vt,
      message: r.message,
    };
  }

  async delete(queueName: string, msgId: bigint): Promise<boolean> {
    const result = await this.sql`
      SELECT pgmq.delete(${queueName}, ${msgId})
    `;
    return result[0].delete;
  }

  async archive(queueName: string, msgId: bigint): Promise<boolean> {
    const result = await this.sql`
      SELECT pgmq.archive(${queueName}, ${msgId})
    `;
    return result[0].archive;
  }

  async purge(queueName: string): Promise<bigint> {
    const result = await this.sql`
      SELECT pgmq.purge_queue(${queueName})
    `;
    return result[0].purge_queue;
  }

  async dropQueue(queueName: string): Promise<void> {
    await this.sql`SELECT pgmq.drop_queue(${queueName})`;
  }

  async close(): Promise<void> {
    await this.sql.end();
  }
}

// Medical-specific queue helpers
export class MedicalQueueService extends PGMQClient {
  async sendVOEAlert(patientId: string, riskLevel: 'low' | 'medium' | 'high', details?: any) {
    return this.send('voe_alerts', {
      patientId,
      riskLevel,
      timestamp: new Date().toISOString(),
      details,
    });
  }

  async sendMedicationReminder(patientId: string, medication: string, dosage: string, time: Date) {
    return this.send('medication_reminders', {
      patientId,
      medication,
      dosage,
      scheduledTime: time.toISOString(),
      createdAt: new Date().toISOString(),
    });
  }

  async sendLabResultNotification(patientId: string, labType: string, results: any, abnormal: boolean) {
    return this.send('lab_result_notifications', {
      patientId,
      labType,
      results,
      abnormal,
      timestamp: new Date().toISOString(),
    });
  }

  async readVOEAlerts(limit: number = 10): Promise<Message<any>[]> {
    return this.read('voe_alerts', 30, limit);
  }

  async readMedicationReminders(limit: number = 10): Promise<Message<any>[]> {
    return this.read('medication_reminders', 30, limit);
  }

  async readLabResultNotifications(limit: number = 10): Promise<Message<any>[]> {
    return this.read('lab_result_notifications', 30, limit);
  }
}

export default PGMQClient;
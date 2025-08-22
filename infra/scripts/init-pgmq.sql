-- Install PGMQ extension
CREATE EXTENSION IF NOT EXISTS pgmq;

-- Create queues for different medical alert types
SELECT pgmq.create('voe_alerts');
SELECT pgmq.create('medication_reminders');
SELECT pgmq.create('lab_result_notifications');
SELECT pgmq.create('clinical_trial_updates');

-- Create audit queue for tracking all medical events
SELECT pgmq.create('medical_audit_log');

-- Optional: Create partitioned queue for high-volume scenarios
-- SELECT pgmq.create_partitioned(
--   queue_name => 'high_volume_alerts',
--   partition_interval => '1 day',
--   retention_interval => '30 days'
-- );
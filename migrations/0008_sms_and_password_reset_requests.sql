-- Adds password-reset request metadata and SMS delivery tracking.
ALTER TABLE complaints ADD COLUMN request_type TEXT;
CREATE INDEX IF NOT EXISTS idx_complaints_request_type_status ON complaints(request_type,status);

CREATE TABLE IF NOT EXISTS sms_notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  boarder_id INTEGER REFERENCES users(id),
  notification_type TEXT NOT NULL,
  event_key TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
  provider_message_id TEXT,
  last_error TEXT,
  sent_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sms_notifications_boarder ON sms_notifications(boarder_id,created_at);
CREATE INDEX IF NOT EXISTS idx_sms_notifications_status ON sms_notifications(status,updated_at);

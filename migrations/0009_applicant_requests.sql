-- Public applicant contact/reschedule requests shown under Admin > Applicants.
ALTER TABLE viewing_schedules ADD COLUMN cancelled_at TEXT;

CREATE INDEX IF NOT EXISTS idx_viewing_schedules_active_applicant
  ON viewing_schedules(applicant_id,cancelled_at,id);

CREATE TABLE IF NOT EXISTS applicant_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  applicant_id INTEGER NOT NULL REFERENCES applicants(id),
  request_type TEXT NOT NULL CHECK (request_type IN ('reschedule','question','cancel')),
  current_viewing_at TEXT,
  requested_viewing_at TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewed','done')),
  admin_reply TEXT,
  reviewed_by INTEGER REFERENCES users(id),
  reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_applicant_requests_status_created
  ON applicant_requests(status,created_at);

CREATE INDEX IF NOT EXISTS idx_applicant_requests_applicant
  ON applicant_requests(applicant_id,created_at);

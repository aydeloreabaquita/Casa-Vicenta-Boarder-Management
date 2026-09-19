PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  email TEXT COLLATE NOCASE UNIQUE,
  phone TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','boarder')),
  must_change_password INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rooms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_number TEXT NOT NULL UNIQUE,
  floor INTEGER NOT NULL CHECK (floor IN (1,2)),
  monthly_rate REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'vacant' CHECK (status IN ('vacant','occupied','maintenance')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS occupancies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  room_id INTEGER NOT NULL REFERENCES rooms(id),
  started_at TEXT NOT NULL DEFAULT (date('now')),
  ended_at TEXT,
  due_day INTEGER NOT NULL DEFAULT 1 CHECK (due_day BETWEEN 1 AND 28),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','ended')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_active_room_occupancy ON occupancies(room_id) WHERE status='active';
CREATE UNIQUE INDEX IF NOT EXISTS idx_active_user_occupancy ON occupancies(user_id) WHERE status='active';

CREATE TABLE IF NOT EXISTS billing_cycles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  occupancy_id INTEGER REFERENCES occupancies(id),
  room_id INTEGER NOT NULL REFERENCES rooms(id),
  boarder_id INTEGER NOT NULL REFERENCES users(id),
  billing_period TEXT NOT NULL,
  due_date TEXT NOT NULL,
  room_rent REAL NOT NULL DEFAULT 0,
  electricity_amount REAL NOT NULL DEFAULT 0,
  electricity_consumption REAL NOT NULL DEFAULT 0,
  electricity_rate REAL NOT NULL DEFAULT 0,
  total_amount REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid','paid','void')),
  paid_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(boarder_id, billing_period)
);

CREATE TABLE IF NOT EXISTS electricity_readings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER NOT NULL REFERENCES rooms(id),
  boarder_id INTEGER NOT NULL REFERENCES users(id),
  billing_period TEXT NOT NULL,
  previous_reading REAL NOT NULL,
  current_reading REAL NOT NULL,
  consumption REAL NOT NULL,
  rate REAL NOT NULL,
  amount REAL NOT NULL,
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(room_id, billing_period)
);

CREATE TABLE IF NOT EXISTS payment_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  boarder_id INTEGER NOT NULL REFERENCES users(id),
  billing_id INTEGER NOT NULL REFERENCES billing_cycles(id),
  declared_amount REAL NOT NULL,
  payment_date TEXT,
  reference_number TEXT,
  receipt_r2_key TEXT NOT NULL,
  receipt_hash TEXT NOT NULL,
  mime_type TEXT,
  original_filename TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','rejected')),
  rejection_reason TEXT,
  submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  boarder_id INTEGER NOT NULL REFERENCES users(id),
  room_id INTEGER NOT NULL REFERENCES rooms(id),
  billing_id INTEGER NOT NULL REFERENCES billing_cycles(id),
  billing_period TEXT NOT NULL,
  amount REAL NOT NULL,
  payment_date TEXT,
  reference_number TEXT,
  receipt_hash TEXT,
  verified_by INTEGER NOT NULL REFERENCES users(id),
  verified_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_payment_per_bill ON payments(billing_id);

CREATE TABLE IF NOT EXISTS applicants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  birth_date TEXT,
  current_address TEXT,
  occupation_school TEXT,
  preferred_move_in TEXT,
  preferred_floor TEXT NOT NULL DEFAULT 'No Preference',
  occupants INTEGER NOT NULL DEFAULT 1,
  emergency_contact TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','scheduled','confirmed','declined','accepted')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS viewing_schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  applicant_id INTEGER NOT NULL REFERENCES applicants(id),
  scheduled_at TEXT NOT NULL,
  notes TEXT,
  email_sent INTEGER NOT NULL DEFAULT 0,
  sms_sent INTEGER NOT NULL DEFAULT 0,
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS complaints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  boarder_id INTEGER NOT NULL REFERENCES users(id),
  room_id INTEGER REFERENCES rooms(id),
  category TEXT NOT NULL,
  subject TEXT,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','seen','in_progress','resolved','closed')),
  admin_notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contracts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  version TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contract_acceptances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contract_id INTEGER NOT NULL REFERENCES contracts(id),
  boarder_id INTEGER NOT NULL REFERENCES users(id),
  accepted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(contract_id, boarder_id)
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_by INTEGER REFERENCES users(id),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id INTEGER REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS receipt_cleanup_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  r2_key TEXT NOT NULL UNIQUE,
  last_error TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO rooms (room_number, floor, monthly_rate, status) VALUES
('101', 1, 5000, 'vacant'),
('102', 1, 5000, 'vacant'),
('201', 2, 5500, 'vacant'),
('202', 2, 5500, 'vacant');

INSERT OR IGNORE INTO settings (key, value) VALUES
('electricity_rate', '14'),
('bank_name', 'Update in Admin Settings'),
('bank_account_name', 'Update in Admin Settings'),
('bank_account_number', 'Update in Admin Settings'),
('landlady_name', 'Update in Admin Settings'),
('landlady_email', 'Update in Admin Settings'),
('landlady_phone', 'Update in Admin Settings');

INSERT OR IGNORE INTO contracts (version, title, content, active) VALUES
('1', 'Casa Vicenta Rules and Regulations', 'Please update this contract from the database before launch. Add payment rules, visitor rules, noise rules, damages, utilities, and move-out policies.', 1);

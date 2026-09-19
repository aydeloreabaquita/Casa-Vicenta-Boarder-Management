ALTER TABLE billing_cycles ADD COLUMN water_amount REAL NOT NULL DEFAULT 0;
ALTER TABLE payment_submissions ADD COLUMN payment_type TEXT NOT NULL DEFAULT 'rent' CHECK (payment_type IN ('rent','electricity','water'));
ALTER TABLE payments ADD COLUMN payment_type TEXT NOT NULL DEFAULT 'rent' CHECK (payment_type IN ('rent','electricity','water'));
DROP INDEX IF EXISTS idx_one_payment_per_bill;
CREATE INDEX IF NOT EXISTS idx_payments_bill_type ON payments(billing_id,payment_type);
CREATE TABLE IF NOT EXISTS boarder_profiles (
 user_id INTEGER PRIMARY KEY REFERENCES users(id), applicant_id INTEGER REFERENCES applicants(id),
 birth_date TEXT, current_address TEXT, occupation_school TEXT, preferred_move_in TEXT,
 preferred_floor TEXT, occupants INTEGER, emergency_contact TEXT, notes TEXT,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO boarder_profiles (user_id,applicant_id,birth_date,current_address,occupation_school,preferred_move_in,preferred_floor,occupants,emergency_contact,notes)
SELECT u.id,a.id,a.birth_date,a.current_address,a.occupation_school,a.preferred_move_in,a.preferred_floor,a.occupants,a.emergency_contact,a.notes
FROM users u JOIN applicants a ON lower(a.email)=lower(u.email)
WHERE u.role='boarder' AND a.id=(SELECT max(x.id) FROM applicants x WHERE lower(x.email)=lower(u.email));
CREATE TABLE IF NOT EXISTS room_water_rates (
 room_id INTEGER PRIMARY KEY REFERENCES rooms(id), monthly_amount REAL NOT NULL DEFAULT 0,
 updated_by INTEGER REFERENCES users(id), updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS payment_promises (
 id INTEGER PRIMARY KEY AUTOINCREMENT, boarder_id INTEGER NOT NULL REFERENCES users(id),
 billing_id INTEGER REFERENCES billing_cycles(id), note TEXT NOT NULL, promised_date TEXT,
 created_by INTEGER NOT NULL REFERENCES users(id), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_promises_boarder ON payment_promises(boarder_id,created_at);

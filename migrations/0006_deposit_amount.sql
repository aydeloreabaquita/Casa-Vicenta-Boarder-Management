-- Stores the refundable/recorded deposit amount for each boarder profile.
ALTER TABLE boarder_profiles ADD COLUMN deposit_amount REAL NOT NULL DEFAULT 0;

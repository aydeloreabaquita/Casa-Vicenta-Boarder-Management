-- Adds Facebook contact details for applicants and boarder profiles.
ALTER TABLE applicants ADD COLUMN facebook TEXT;
ALTER TABLE boarder_profiles ADD COLUMN facebook TEXT;

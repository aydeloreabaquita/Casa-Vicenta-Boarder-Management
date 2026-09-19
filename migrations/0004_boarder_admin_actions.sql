-- Supports reversible historical records while allowing admins to remove a boarder's login/profile from active management views.
ALTER TABLE users ADD COLUMN deleted_at TEXT;
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);

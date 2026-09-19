-- Use one monthly water charge for every room.
-- If a per-room water value was already configured, preserve the most recently updated value as the new global default.
INSERT OR IGNORE INTO settings (key,value)
VALUES (
  'water_monthly_amount',
  COALESCE((
    SELECT CAST(monthly_amount AS TEXT)
    FROM room_water_rates
    ORDER BY updated_at DESC, room_id DESC
    LIMIT 1
  ), '0')
);

-- Casa Vicenta 30-room inventory: 12 on floor 1, 18 on floor 2.
-- Existing room records are preserved, including their rates, status and occupancy.
-- Newly inserted rooms default to vacant at the NON-AC rate of PHP 4,500.
-- Admin must identify AC rooms and update their rates to PHP 5,500.
-- This migration must be applied to the correct Cloudflare D1 environment.

WITH RECURSIVE numbers(n) AS (
  SELECT 1 UNION ALL SELECT n + 1 FROM numbers WHERE n < 12
)
INSERT OR IGNORE INTO rooms (room_number, floor, monthly_rate, status)
SELECT printf('1%02d', n), 1, 4500, 'vacant' FROM numbers;

WITH RECURSIVE numbers(n) AS (
  SELECT 1 UNION ALL SELECT n + 1 FROM numbers WHERE n < 18
)
INSERT OR IGNORE INTO rooms (room_number, floor, monthly_rate, status)
SELECT printf('2%02d', n), 2, 4500, 'vacant' FROM numbers;

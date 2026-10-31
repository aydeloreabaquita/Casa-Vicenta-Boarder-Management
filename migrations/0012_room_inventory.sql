-- Ensure the public room-number inventory includes three rooms on each floor.
INSERT OR IGNORE INTO rooms (room_number, floor, monthly_rate, status) VALUES
('101', 1, 6500, 'vacant'),
('102', 1, 6500, 'vacant'),
('103', 1, 6800, 'vacant'),
('201', 2, 7200, 'vacant'),
('202', 2, 7200, 'vacant'),
('203', 2, 7500, 'vacant');

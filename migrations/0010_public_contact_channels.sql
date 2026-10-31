-- Configure Casa Vicenta's public WhatsApp and Facebook contact channels.
INSERT INTO settings (key, value) VALUES
('landlady_phone', '+639674330745'),
('landlady_facebook', 'https://www.facebook.com/profile.php?id=61595747145155')
ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP;

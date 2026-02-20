ALTER TABLE clients ADD COLUMN IF NOT EXISTS email TEXT;
COMMENT ON COLUMN clients.email IS 'Primary contact email for client user access';
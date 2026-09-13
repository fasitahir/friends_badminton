-- Add role column to admins
ALTER TABLE admins ADD COLUMN role TEXT NOT NULL DEFAULT 'admin';
ALTER TABLE admins ADD CONSTRAINT admins_role_check CHECK (role IN ('admin', 'superadmin'));

-- Make fasitahir a superadmin
UPDATE admins SET role = 'superadmin' WHERE username = 'fasitahir';

-- Add tracking columns to matches
ALTER TABLE matches ADD COLUMN created_by UUID REFERENCES admins(id) ON DELETE SET NULL;
ALTER TABLE matches ADD COLUMN updated_by UUID REFERENCES admins(id) ON DELETE SET NULL;
ALTER TABLE matches ADD COLUMN updated_at TIMESTAMPTZ;

-- Note: We are setting updated_at and updated_by via application logic.

-- Add new columns to users table
ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user';     -- 'user' or 'admin'
ALTER TABLE users ADD COLUMN avatar_color INTEGER DEFAULT 0;        -- 0-7 for color palette
ALTER TABLE users ADD COLUMN about TEXT DEFAULT '';                 -- Bio

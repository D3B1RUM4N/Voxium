ALTER TABLE rooms ADD COLUMN kind TEXT NOT NULL DEFAULT 'text';
UPDATE rooms SET kind = 'text' WHERE kind IS NULL OR kind = '';

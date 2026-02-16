-- Add image_url column to messages for image attachments
ALTER TABLE messages ADD COLUMN image_url TEXT DEFAULT NULL;

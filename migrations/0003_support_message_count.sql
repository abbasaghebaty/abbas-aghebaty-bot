-- Track the number of messages a user sends during one support session.
ALTER TABLE support_user_states
ADD COLUMN message_count INTEGER NOT NULL DEFAULT 0;

CREATE TABLE csrf_tokens (
    token text NOT NULL PRIMARY KEY,
    creation_time timestamptz NOT NULL DEFAULT NOW());

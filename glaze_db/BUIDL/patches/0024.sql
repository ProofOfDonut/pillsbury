ALTER TABLE withdrawals
    -- This currently has to be tracked manually.
    ADD COLUMN success boolean NOT NULL DEFAULT TRUE;

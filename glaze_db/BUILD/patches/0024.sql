ALTER TABLE withdrawals
    -- This currently has to be tracked manually.
    ADD COLUMN success boolean NOT NULL DEFAULT TRUE;

INSERT INTO manually_applied_patches (id)
    VALUES ('0024');

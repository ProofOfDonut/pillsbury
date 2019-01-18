ALTER TABLE sessions
    ADD COLUMN active boolean NOT NULL DEFAULT TRUE;

INSERT INTO manually_applied_patches (id)
    VALUES ('0012');

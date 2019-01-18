CREATE TABLE manually_applied_patches (
    id text NOT NULL PRIMARY KEY,
    applied_time timestamptz NOT NULL DEFAULT NOW()
        CHECK (date_part('timezone', applied_time) = 0));

INSERT INTO manually_applied_patches (id)
    VALUES ('0000'), ('0001'), ('0002'), ('0003'), ('0004'), ('0005'), ('0006'),
           ('0007'), ('0008'), ('0009'), ('0010'), ('0011');

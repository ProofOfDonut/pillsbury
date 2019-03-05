ALTER TABLE withdrawals
    ADD COLUMN error text NOT NULL DEFAULT '';

ALTER TABLE withdrawals
    ALTER COLUMN success DROP NOT NULL;
ALTER TABLE withdrawals
    ALTER COLUMN success SET DEFAULT NULL;

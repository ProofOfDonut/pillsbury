-- We start with the default to false so that old rows receive this, but we
-- then switch to true so that new rows get this until it's switched off either
-- automatically on success or manually if there's a problem.
ALTER TABLE withdrawals
    ADD COLUMN needs_manual_review boolean NOT NULL DEFAULT FALSE;

ALTER TABLE withdrawals
    ALTER COLUMN needs_manual_review SET DEFAULT TRUE;

ALTER TYPE event_type
    ADD VALUE 'reddit_withdrawal_confirmation_error';

ALTER TYPE event_type
    ADD VALUE 'withdrawal_error';

ALTER TYPE event_type
    ADD VALUE 'balance_ok';

ALTER TYPE event_type
    ADD VALUE 'balance_mismatch';

CREATE FUNCTION generate_public_id()
    RETURNS citext
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Public IDs look like Ethereum addresses so that they can be used on chain
  -- with the `address` type when needed.
  RETURN '0x00000000'::text
      || replace((public.uuid_generate_v4())::text, '-'::text, ''::text);
END; $$;

ALTER TABLE users
    ALTER COLUMN public_id SET DEFAULT generate_public_id();

ALTER TABLE erc20_deposit_ids
    ALTER COLUMN deposit_id SET DEFAULT generate_public_id();

CREATE TYPE withdrawal_receipt_type AS ENUM (
    'reddit_message_id',
    'ethereum_transaction_id',
    'ethereum_signed_withdrawal');

CREATE TYPE withdrawal_receipt AS (
    type withdrawal_receipt_type,
    value text);

CREATE FUNCTION tmp__withdrawal_receipt(
    _transaction_id text)
    RETURNS withdrawal_receipt
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF _transaction_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Up until now we haven't been tracking Reddit message IDs for withdrawals.
  IF _transaction_id = '' THEN
    RETURN ('reddit_message_id', '')::withdrawal_receipt;
  END IF;

  RETURN ('ethereum_transaction_id', _transaction_id)::withdrawal_receipt;
END; $$;

ALTER TABLE withdrawals
    ADD COLUMN public_id citext NOT NULL DEFAULT generate_public_id(),
    ADD COLUMN receipt withdrawal_receipt;

UPDATE withdrawals
    SET receipt = tmp__withdrawal_receipt(transaction_id);

ALTER TABLE withdrawals
    DROP COLUMN transaction_id;

DROP FUNCTION tmp__withdrawal_receipt(text);

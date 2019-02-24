CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE FUNCTION is_valid_public_id (value text) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN value SIMILAR TO '0x[0-9a-fA-F]{40}';
END; $$;

ALTER TABLE users
    -- The public_id should be in the form of an Ethereum address. This allows
    -- it to be indexed in a Solidity event.
    ADD COLUMN public_id citext NOT NULL UNIQUE
        CHECK (is_valid_public_id(public_id))
        DEFAULT '0x00000000' || replace(uuid_generate_v4()::text, '-', '');

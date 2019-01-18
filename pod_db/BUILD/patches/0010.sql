CREATE TABLE erc20_deposits (
    id serial NOT NULL PRIMARY KEY,
    asset_id int NOT NULL REFERENCES assets (id),
    transaction citext NOT NULL,
    from_address citext NOT NULL,
    to_user int NOT NULL REFERENCES users (id),
    amount int NOT NULL,
    received_time timestamptz NOT NULL DEFAULT NOW()
        CHECK (date_part('timezone', received_time) = 0));

CREATE TABLE vars (
    key text NOT NULL PRIMARY KEY,
    value text NOT NULL);

INSERT INTO vars (key, value)
    VALUES ('last_erc20_deposit_block', 0);

CREATE FUNCTION deposit_erc20 (
    _asset_id int,
    _block int,
    _transaction citext,
    _from_address citext,
    _to_public_id citext,
    _amount int)
    RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  _to_user_id int;
BEGIN
  SELECT id
      INTO _to_user_id
      FROM users
      WHERE public_id = _to_public_id
      LIMIT 1;

  IF _to_user_id IS NULL THEN
    RAISE EXCEPTION '[0]: Invalid public user ID.';
  END IF;

  INSERT INTO erc20_deposits
      (asset_id, transaction, from_address, to_user, amount)
      VALUES (_asset_id, _transaction, _from_address, _to_user_id, _amount);

  UPDATE balances b
      SET balance = b.balance + _amount
      WHERE b.user_id = _to_user_id;

  UPDATE vars
      SET value = _block::text
      WHERE key = 'last_erc20_deposit_block';
END; $$;

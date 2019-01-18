DROP FUNCTION deposit_erc20(
    _asset_id integer,
    _block integer,
    _transaction citext,
    _from_address citext,
    _to_public_id citext,
    _amount integer);
CREATE FUNCTION deposit_erc20(
    _asset_id integer,
    _block integer,
    _transaction citext,
    _from_address citext,
    _to_public_id citext,
    _amount integer)
    RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  _to_user_id int;
  _balance int;
  _last_block int;
BEGIN
  LOCK balances IN ROW EXCLUSIVE MODE;

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

  SELECT balance
      INTO _balance
      FROM balances
      WHERE user_id = _to_user_id
          AND asset_id = _asset_id
      LIMIT 1;
  IF _balance IS NULL THEN
    INSERT INTO balances (user_id, asset_id, balance)
        VALUES (_to_user_id, _asset_id, _amount);
  ELSE
    UPDATE balances b
        SET balance = b.balance + _amount
        WHERE b.user_id = _to_user_id
            AND asset_id = _asset_id;
  END IF;

  LOCK vars IN ROW EXCLUSIVE MODE;
  SELECT value::int
      INTO _last_block
      FROM vars
      WHERE key = 'last_erc20_deposit_block'
      LIMIT 1;
  IF _block > _last_block THEN
    UPDATE vars
        SET value = _block::text
        WHERE key = 'last_erc20_deposit_block';
  END IF;
END; $$;

INSERT INTO manually_applied_patches (id)
    VALUES ('0022');

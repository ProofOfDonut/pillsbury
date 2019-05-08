INSERT INTO vars (key, value)
    VALUES ('erc20_withdrawal_fee_type', 'static');
INSERT INTO vars (key, value)
    VALUES ('erc20_withdrawal_fee_value', '0');

ALTER TABLE withdrawals
    ADD COLUMN fee int NOT NULL DEFAULT 0;

ALTER TABLE withdrawals
    ALTER COLUMN fee DROP DEFAULT;

DROP FUNCTION withdraw(
    _from_user_id integer,
    _type withdrawal_type,
    _username text,
    _asset_id integer,
    _amount integer,
    _update_balance boolean);
CREATE FUNCTION withdraw(
    _from_user_id integer,
    _type withdrawal_type,
    _username text,
    _asset_id integer,
    _amount integer,
    _update_balance boolean)
    RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
  _old_balance int;
  _new_balance int;
  _fee int;
  _fee_type text;
  _fee_value int;
  _withdrawal_id int;
  _available_withdrawals int;
  _recipient account;
BEGIN
  LOCK users IN ROW EXCLUSIVE MODE;
  LOCK balances IN ROW EXCLUSIVE MODE;

  IF _type = 'reddit' THEN
    IF NOT EXISTS (
        SELECT 1 FROM reddit_accounts
            WHERE user_id = _from_user_id
                AND username = _username
            LIMIT 1) THEN
      RAISE EXCEPTION 'Cannot withdraw to unlinked Reddit account.';
    END IF;

    _recipient := ('reddit_user', _username);
    UPDATE balances
        SET deposit_limit = deposit_limit + _amount
        WHERE user_id = _from_user_id
            AND asset_id = _asset_id
            -- A -1 deposit limit indicates no limit.
            AND deposit_limit >= 0;

    _fee := 0;
  ELSIF _type = 'ethereum' THEN
    SELECT get_available_erc20_withdrawals(_from_user_id)
        INTO _available_withdrawals;
    IF _available_withdrawals <= 0 THEN
      RAISE EXCEPTION '[1] Withdrawal limit reached.';
    END IF;

    -- The recipient is unknown, so we set this to NULL.
    _recipient := NULL;

    _fee := calculate_erc20_withdrawal_fee(_from_user_id, _amount);
  ELSE
    RAISE EXCEPTION 'Unexpected withdrawal type "%"', _type;
  END IF;

  -- There is a bit of a race condition between counting withdrawals above and
  -- inserting the withdrawal here, but it's acceptable because the worst that
  -- could happen is it could allow an extra withdrawal or two, which would be
  -- ok. The performance hit we would take for locking the table isn't worth it
  -- in this case.
  INSERT INTO withdrawals (
        from_user_id,
        recipient,
        asset_id,
        amount,
        fee,
        balance_updated
      )
      VALUES (
        _from_user_id,
        _recipient,
        _asset_id,
        _amount,
        _fee,
        _update_balance
      )
      RETURNING id INTO _withdrawal_id;

  SELECT balance
      INTO _old_balance
      FROM balances
      WHERE user_id = _from_user_id
          AND asset_id = _asset_id;
  IF _old_balance IS NULL THEN
    RAISE EXCEPTION 'Insufficient balance.';
  END IF;
  _new_balance := _old_balance - _amount - _fee;
  IF _new_balance < 0 THEN
    RAISE EXCEPTION 'Insufficient balance.';
  END IF;
  IF _update_balance THEN
    UPDATE balances
        SET balance = _new_balance
        WHERE user_id = _from_user_id
            AND asset_id = _asset_id;
  END IF;

  RETURN _withdrawal_id;
END; $$;

CREATE FUNCTION calculate_erc20_withdrawal_fee(
    _user_id int,
    _amount int)
    RETURNS int
    LANGUAGE plpgsql
    AS $$
DECLARE
  _fee_type text;
  _fee_value int;
BEGIN
  -- Select both values at the same time so we don't have to worry about race
  -- conditions.
  SELECT (SELECT value FROM vars WHERE key = 'erc20_withdrawal_fee_type'),
         (SELECT value FROM vars WHERE key = 'erc20_withdrawal_fee_value')
      INTO _fee_type, _fee_value;

  IF _fee_type = 'static' THEN
    RETURN _fee_value;
  ELSIF _fee_type = 'relative' THEN
    RETURN _fee_value * _amount / 10000;
  ELSE
    RAISE EXCEPTION 'Unexpected fee type "%".', _fee_type;
  END IF;
END; $$;

INSERT INTO role_permissions (role, permission)
    VALUES ('admin', 'edit_fees');

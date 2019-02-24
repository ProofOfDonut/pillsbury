ALTER TABLE users
    ADD COLUMN erc20_withdrawal_limit int NOT NULL DEFAULT 5;

CREATE FUNCTION get_available_erc20_withdrawals(
    _user_id int)
    RETURNS int
    LANGUAGE plpgsql
    AS $$
DECLARE
  _withdrawals_per_day int;
  _withdrawal_count int;
BEGIN
  _withdrawals_per_day := 0;
  SELECT erc20_withdrawal_limit
      INTO _withdrawals_per_day
      FROM users
      WHERE id = _user_id
      LIMIT 1;

  SELECT COUNT(1)
      INTO _withdrawal_count
      FROM withdrawals
      WHERE from_user_id = _user_id
          AND creation_time > now() - interval '1 day';

  RETURN GREATEST(0, _withdrawals_per_day - _withdrawal_count);
END; $$;

DROP FUNCTION withdraw(
    _from_user_id integer,
    _to public.account,
    _asset_id integer,
    _amount integer);
CREATE FUNCTION withdraw(
    _from_user_id integer,
    _to public.account,
    _asset_id integer,
    _amount integer)
    RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
  _old_balance int;
  _new_balance int;
  _withdrawal_id int;
  _available_withdrawals int;
BEGIN
  LOCK users IN ROW EXCLUSIVE MODE;
  LOCK balances IN ROW EXCLUSIVE MODE;

  IF _to.type = 'reddit_user' THEN
    IF NOT EXISTS (
        SELECT 1 FROM reddit_accounts
            WHERE user_id = _from_user_id
                AND username = _to.value
            LIMIT 1) THEN
      RAISE EXCEPTION 'Cannot withdraw to unlinked Reddit account.';
    END IF;

    UPDATE balances
        SET deposit_limit = deposit_limit + _amount
        WHERE user_id = _from_user_id
            AND asset_id = _asset_id
            -- A -1 deposit limit indicates no limit.
            AND deposit_limit >= 0;
  ELSIF _to.type = 'ethereum_address' THEN
    SELECT get_available_erc20_withdrawals(_from_user_id)
        INTO _available_withdrawals;
    IF _available_withdrawals <= 0 THEN
      RAISE EXCEPTION '[1] Withdrawal limit reached.';
    END IF;
  END IF;

  -- There is a bit of a race condition between counting withdrawals above and
  -- inserting the withdrawal here, but it's acceptable because the worst that
  -- could happen is it could allow an extra withdrawal or two, which would be
  -- ok. The performance hit we would take for locking the table isn't worth it
  -- in this case.
  INSERT INTO withdrawals (from_user_id, recipient, asset_id, amount)
      VALUES (_from_user_id, _to, _asset_id, _amount)
      RETURNING id INTO _withdrawal_id;

  SELECT balance
      INTO _old_balance
      FROM balances
      WHERE user_id = _from_user_id
          AND asset_id = _asset_id;
  IF _old_balance IS NULL OR _old_balance < _amount THEN
    RAISE EXCEPTION 'Insufficient balance.';
  END IF;
  _new_balance := _old_balance - _amount;
  UPDATE balances
      SET balance = _new_balance
      WHERE user_id = _from_user_id
          AND asset_id = _asset_id;

  RETURN _withdrawal_id;
END; $$;

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
BEGIN
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
            AND asset_id = _asset_id;
  END IF;

  INSERT INTO withdrawals (from_user_id, recipient, asset_id, amount)
      VALUES (_from_user_id, _to, _asset_id, _amount)
      RETURNING id INTO _withdrawal_id;

  LOCK balances IN ROW EXCLUSIVE MODE;
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

INSERT INTO manually_applied_patches (id)
    VALUES ('0018');

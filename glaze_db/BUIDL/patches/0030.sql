CREATE TABLE refunds (
    user_id int,
    amount int,
    refund_time timestamptz NOT NULL DEFAULT now());

CREATE FUNCTION get_next_refund(
    _asset_id int)
    RETURNS TABLE (username text, amount int)
    LANGUAGE plpgsql
    AS $$
DECLARE
  _user_id int;
  _username text;
  _amount int;
BEGIN
  SELECT b.user_id, ra.username, b.balance
      INTO _user_id, _username, _amount
      FROM balances b
      INNER JOIN reddit_accounts ra ON ra.user_id = b.user_id
      WHERE b.balance IS NOT NULL AND b.balance > 0
          AND b.asset_id = _asset_id;

  IF _user_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE balances
      SET balance = 0
      WHERE user_id = _user_id
          AND asset_id = _asset_id;

  INSERT INTO refunds (user_id, amount) VALUES (_user_id, _amount);

  RETURN QUERY SELECT _username, _amount;
END; $$;

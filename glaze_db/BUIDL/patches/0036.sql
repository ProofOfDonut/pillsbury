DROP FUNCTION get_available_erc20_withdrawals(
    _user_id integer);
CREATE FUNCTION get_available_erc20_withdrawals(
    _user_id integer)
    RETURNS integer
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
          AND (recipient).type = 'ethereum_address'
          AND creation_time > now() - interval '1 day';

  RETURN GREATEST(0, _withdrawals_per_day - _withdrawal_count);
END; $$;

DROP FUNCTION calculate_erc20_withdrawal_fee(
    _user_id int,
    _amount int);
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
    RETURN ceil((_fee_value * _amount)::decimal / 10000);
  ELSE
    RAISE EXCEPTION 'Unexpected fee type "%".', _fee_type;
  END IF;
END; $$;


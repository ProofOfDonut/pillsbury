DROP FUNCTION add_inbound_delivery(
    _reddit_message_id text,
    _subreddit text,
    _from_reddit_user text,
    _amount integer,
    _sent_time timestamp with time zone);
CREATE FUNCTION add_inbound_delivery(
    _reddit_message_id text,
    _subreddit text,
    _from_reddit_user text,
    _amount integer,
    _sent_time timestamp with time zone)
    RETURNS integer
    LANGUAGE plpgsql
    AS $$
-- This funciton returns a number indicating how many donuts should be sent back
-- to the user due to a deposit excess (while we're limiting the number of
-- donuts that can be deposited). If the number returned is -1, then the deposit
-- has already been processed.
DECLARE
  _asset_id int;
  _user_id int;
  _existing_balance int;
  _existing_deposit_limit int;
  _limited_amount int;
BEGIN
  LOCK users IN ROW EXCLUSIVE MODE;
  LOCK reddit_accounts IN ROW EXCLUSIVE MODE;
  LOCK balances IN ROW EXCLUSIVE MODE;
  LOCK deliveries IN ROW EXCLUSIVE MODE;

  IF EXISTS (
      SELECT 1
          FROM deliveries
          WHERE reddit_message_id = _reddit_message_id) THEN
    RETURN -1;
  END IF;

  SELECT id
      INTO _asset_id
      FROM assets
      WHERE subreddit = _subreddit
      LIMIT 1;
  IF _asset_id IS NULL THEN
    RAISE EXCEPTION 'Asset does not exist for subreddit "%".', _subreddit;
  END IF;

  _user_id := get_or_create_user_for_reddit_account(_from_reddit_user);

  SELECT balance, deposit_limit
      INTO _existing_balance, _existing_deposit_limit
      FROM balances
      WHERE user_id = _user_id
          AND asset_id = _asset_id
      LIMIT 1;
  IF _existing_deposit_limit IS NULL THEN
    _existing_deposit_limit := 1000;
  END IF;
  _limited_amount := LEAST(_existing_deposit_limit, _amount);
  IF _limited_amount <= 0 THEN
    _limited_amount := 0;
  ELSIF _existing_balance IS NULL THEN
    INSERT INTO balances
        (user_id, asset_id, balance, deposit_limit)
        VALUES (
          _user_id,
          _asset_id,
          _limited_amount,
          _existing_deposit_limit - _limited_amount
        );
  ELSE
    UPDATE balances
        SET balance = _existing_balance + _limited_amount,
            deposit_limit = _existing_deposit_limit - _limited_amount
        WHERE user_id = _user_id
            AND asset_id = _asset_id;
  END IF;

  INSERT INTO deliveries
      (
        reddit_message_id,
        from_user_id,
        asset_id,
        amount,
        sent_time
      )
      VALUES (
        _reddit_message_id,
        _user_id,
        _asset_id,
        _amount,
        _sent_time
      );

  RETURN _amount - _limited_amount;
END; $$;

CREATE TABLE account_types (
    name text NOT NULL PRIMARY KEY);

INSERT INTO account_types (name) VALUES ('ethereum_address'), ('reddit_user');

CREATE TYPE account AS (
    type text,
    value text);

CREATE TABLE withdrawals (
    id serial NOT NULL PRIMARY KEY,
    from_user_id int NOT NULL REFERENCES users (id),
    recipient account,
    asset_id int NOT NULL REFERENCES assets (id),
    amount int NOT NULL,
    transaction_id text,
    creation_time timestamptz NOT NULL DEFAULT NOW());

CREATE FUNCTION withdraw (
    _from_user_id int,
    _to account,
    _asset_id int,
    _amount int)
    RETURNS int
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

ALTER TABLE reddit_accounts
    ADD COLUMN access_token_expiration timestamptz NOT NULL DEFAULT NOW();

DROP FUNCTION create_session_for_reddit_user(
    _token text,
    _reddit_username text,
    _access_token text,
    _refresh_token text,
    _expiration timestamptz);
CREATE FUNCTION create_session_for_reddit_user(
    _token text,
    _reddit_username text,
    _access_token text,
    _refresh_token text,
    _expiration timestamptz)
    RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  _user_id int;
BEGIN
  _user_id := get_or_create_user_for_reddit_account(_reddit_username);
  UPDATE reddit_accounts
      SET access_token = _access_token,
          refresh_token = _refresh_token,
          -- We're currently assuming Reddit access tokens expire in 1 hour
          -- rather than using the expiration time returned by the Reddit API.
          access_token_expiration = NOW() + interval '50 minutes'
      WHERE username = _reddit_username;
  INSERT INTO sessions (token, user_id, expiration)
      VALUES (_token, _user_id, _expiration);
END; $$;

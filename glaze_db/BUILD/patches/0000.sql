CREATE EXTENSION IF NOT EXISTS citext;

CREATE FUNCTION public.update_last_modified_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.last_modified := NOW();
  RETURN NEW;
END; $$;

CREATE TABLE users (
    id serial NOT NULL PRIMARY KEY,
    creation_time timestamptz NOT NULL DEFAULT NOW());

CREATE TABLE reddit_accounts (
    username citext NOT NULL PRIMARY KEY,
    user_id int NOT NULL REFERENCES users (id),
    creation_time timestamptz NOT NULL DEFAULT NOW(),
    access_token text,
    refresh_token text);

CREATE TABLE assets (
    id serial NOT NULL PRIMARY KEY,
    subreddit text NOT NULL UNIQUE,
    name_singular text NOT NULL,
    name_plural text NOT NULL,
    symbol text NOT NULL,
    creation_time timestamptz NOT NULL DEFAULT NOW());

INSERT INTO assets (subreddit, name_singular, name_plural, symbol)
    VALUES ('ethtrader', 'Donut', 'Donuts', 'DONUT');

CREATE TABLE balances (
    user_id int NOT NULL REFERENCES users (id),
    asset_id int NOT NULL REFERENCES assets (id),
    balance int NOT NULL,
    last_modified timestamptz NOT NULL DEFAULT NOW()
        CHECK (date_part('timezone', last_modified) = 0));

CREATE TRIGGER update_balances_last_modified
    BEFORE UPDATE ON balances
    FOR EACH ROW EXECUTE PROCEDURE update_last_modified_column();

CREATE TABLE deliveries (
    id serial NOT NULL PRIMARY KEY,
    reddit_message_id text NOT NULL UNIQUE,
    from_user_id int NOT NULL REFERENCES users (id),
    asset_id int NOT NULL REFERENCES assets (id),
    amount int NOT NULL,
    sent_time timestamptz NOT NULL
        CHECK (date_part('timezone', sent_time) = 0),
    received_time timestamptz NOT NULL DEFAULT NOW()
        CHECK (date_part('timezone', received_time) = 0));

CREATE FUNCTION get_or_create_user_for_reddit_account(
    _reddit_username text)
    RETURNS int
    LANGUAGE plpgsql
    AS $$
DECLARE
  _user_id int;
BEGIN
  -- A lookup and then insert was chosen over an `ON CONFLICT UPDATE` because
  -- the latter way increases the serial user ID field each time there's a
  -- conflict.
  SELECT user_id
      INTO _user_id
      FROM reddit_accounts
      WHERE username = _reddit_username
      LIMIT 1;

  IF _user_id IS NULL THEN
    INSERT INTO users
        DEFAULT VALUES
        RETURNING id INTO _user_id;
    INSERT INTO reddit_accounts (username, user_id)
        VALUES (_reddit_username, _user_id);
  END IF;

  RETURN _user_id;
END; $$;

CREATE FUNCTION add_inbound_delivery (
    _reddit_message_id text,
    _subreddit text,
    _from_reddit_user text,
    _amount int,
    _sent_time timestamptz)
    RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
  _asset_id int;
  _user_id int;
BEGIN
  LOCK users IN ROW EXCLUSIVE MODE;
  LOCK reddit_accounts IN ROW EXCLUSIVE MODE;
  LOCK balances IN ROW EXCLUSIVE MODE;
  LOCK deliveries IN ROW EXCLUSIVE MODE;

  IF EXISTS (
      SELECT 1
          FROM deliveries
          WHERE reddit_message_id = _reddit_message_id) THEN
    RETURN FALSE;
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

  IF NOT EXISTS (
      SELECT 1
          FROM balances
          WHERE user_id = _user_id AND asset_id = _asset_id
          LIMIT 1) THEN
    INSERT INTO balances (user_id, asset_id, balance)
        VALUES (_user_id, _asset_id, _amount);
  ELSE
    UPDATE balances
        SET balance = balances.balance + _amount
        WHERE user_id = _user_id AND asset_id = _asset_id;
  END IF;

  INSERT INTO deliveries (
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

  RETURN TRUE;
END; $$;

CREATE TABLE sessions (
    token text NOT NULL PRIMARY KEY,
    user_id int NOT NULL REFERENCES users (id),
    expiration timestamptz NOT NULL,
    creation_time timestamptz NOT NULL DEFAULT NOW());

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
          refresh_token = _refresh_token
      WHERE username = _reddit_username;
  INSERT INTO sessions (token, user_id, expiration)
      VALUES (_token, _user_id, _expiration);
END; $$;

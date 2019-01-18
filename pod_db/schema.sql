--
-- PostgreSQL database dump
--

-- Dumped from database version 9.6.10
-- Dumped by pg_dump version 9.6.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: plpgsql; Type: EXTENSION; Schema: -; Owner:
--

CREATE EXTENSION IF NOT EXISTS plpgsql WITH SCHEMA pg_catalog;


--
-- Name: EXTENSION plpgsql; Type: COMMENT; Schema: -; Owner:
--

COMMENT ON EXTENSION plpgsql IS 'PL/pgSQL procedural language';


--
-- Name: citext; Type: EXTENSION; Schema: -; Owner:
--

CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA public;


--
-- Name: EXTENSION citext; Type: COMMENT; Schema: -; Owner:
--

COMMENT ON EXTENSION citext IS 'data type for case-insensitive character strings';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner:
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner:
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: account; Type: TYPE; Schema: public; Owner: pod_admin
--

CREATE TYPE public.account AS (
	type text,
	value text
);


ALTER TYPE public.account OWNER TO pod_admin;

--
-- Name: add_inbound_delivery(text, text, text, integer, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: pod_admin
--

CREATE FUNCTION public.add_inbound_delivery(_reddit_message_id text, _subreddit text, _from_reddit_user text, _amount integer, _sent_time timestamp with time zone) RETURNS integer
    LANGUAGE plpgsql
    AS $$
-- This function returns a number indicating how many donuts should be sent back
-- to the user. This number was originally used to enforce a deposit limit,
-- which we're not currently enforcing. If the number returned is -1, then the
-- deposit has already been processed.
DECLARE
  _asset_id int;
  _user_id int;
  _existing_balance int;
  _existing_deposit_limit int;
  _new_deposit_limit int;
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
    _existing_deposit_limit := -1;
  END IF;
  IF _existing_deposit_limit > -1 THEN
    _limited_amount := LEAST(_existing_deposit_limit, _amount);
    _new_deposit_limit := _existing_deposit_limit - _limited_amount;
  ELSE
    _limited_amount := _amount;
    _new_deposit_limit := -1;
  END IF;
  IF _limited_amount <= 0 THEN
    _limited_amount := 0;
  ELSIF _existing_balance IS NULL THEN
    INSERT INTO balances
        (user_id, asset_id, balance, deposit_limit)
        VALUES (
          _user_id,
          _asset_id,
          _limited_amount,
          _new_deposit_limit
        );
  ELSE
    UPDATE balances
        SET balance = _existing_balance + _limited_amount,
            deposit_limit = _new_deposit_limit
        WHERE user_id = _user_id
            AND asset_id = _asset_id;
  END IF;

  INSERT INTO deliveries
      (
        reddit_message_id,
        from_user_id,
        asset_id,
        deposited_amount,
        excess,
        sent_time
      )
      VALUES (
        _reddit_message_id,
        _user_id,
        _asset_id,
        _limited_amount,
        _amount - _limited_amount,
        _sent_time
      );

  RETURN _amount - _limited_amount;
END; $$;


ALTER FUNCTION public.add_inbound_delivery(_reddit_message_id text, _subreddit text, _from_reddit_user text, _amount integer, _sent_time timestamp with time zone) OWNER TO pod_admin;

--
-- Name: create_session_for_reddit_user(text, text, text, text, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: pod_admin
--

CREATE FUNCTION public.create_session_for_reddit_user(_token text, _reddit_username text, _access_token text, _refresh_token text, _expiration timestamp with time zone) RETURNS void
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


ALTER FUNCTION public.create_session_for_reddit_user(_token text, _reddit_username text, _access_token text, _refresh_token text, _expiration timestamp with time zone) OWNER TO pod_admin;

--
-- Name: deposit_erc20(integer, integer, public.citext, public.citext, public.citext, integer); Type: FUNCTION; Schema: public; Owner: pod_admin
--

CREATE FUNCTION public.deposit_erc20(_asset_id integer, _block integer, _transaction public.citext, _from_address public.citext, _to_deposit_id public.citext, _amount integer) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  _to_user_id int;
  _balance int;
  _last_block int;
BEGIN
  LOCK balances IN ROW EXCLUSIVE MODE;

  -- First try looking up by deposit ID.
  SELECT user_id
      INTO _to_user_id
      FROM erc20_deposit_ids
      WHERE deposit_id = _to_deposit_id
      LIMIT 1;

  IF _to_user_id IS NULL THEN
    -- Then try looking up based on the user's public ID (this was an old way
    -- of doing deposits).
    SELECT id
        INTO _to_user_id
        FROM users
        WHERE public_id = _to_deposit_id
        LIMIT 1;

    IF _to_user_id IS NULL THEN
      RAISE EXCEPTION '[0]: Invalid public user ID.';
    END IF;
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


ALTER FUNCTION public.deposit_erc20(_asset_id integer, _block integer, _transaction public.citext, _from_address public.citext, _to_deposit_id public.citext, _amount integer) OWNER TO pod_admin;

--
-- Name: get_available_erc20_withdrawals(integer); Type: FUNCTION; Schema: public; Owner: pod_admin
--

CREATE FUNCTION public.get_available_erc20_withdrawals(_user_id integer) RETURNS integer
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


ALTER FUNCTION public.get_available_erc20_withdrawals(_user_id integer) OWNER TO pod_admin;

--
-- Name: get_next_nonce(public.citext); Type: FUNCTION; Schema: public; Owner: pod_admin
--

CREATE FUNCTION public.get_next_nonce(_address public.citext) RETURNS integer
    LANGUAGE plpgsql
    AS $_$
DECLARE
  _next int;
BEGIN
  LOCK nonces IN ROW EXCLUSIVE MODE;
  IF _address LIKE '^0x[\da-fA-F]+$' THEN
    RAISE EXCEPTION 'Invalid address %', _address;
  END IF;
  SELECT next INTO _next FROM nonces WHERE address = _address;
  IF _next IS NULL THEN
    _next = 0;
    INSERT INTO nonces (address, next) VALUES (_address, _next + 1);
  ELSE
    UPDATE nonces SET next = _next + 1 WHERE address = _address;
  END IF;
  RETURN _next;
END; $_$;


ALTER FUNCTION public.get_next_nonce(_address public.citext) OWNER TO pod_admin;

--
-- Name: get_or_create_user_for_reddit_account(text); Type: FUNCTION; Schema: public; Owner: pod_admin
--

CREATE FUNCTION public.get_or_create_user_for_reddit_account(_reddit_username text) RETURNS integer
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


ALTER FUNCTION public.get_or_create_user_for_reddit_account(_reddit_username text) OWNER TO pod_admin;

--
-- Name: get_random_string(integer); Type: FUNCTION; Schema: public; Owner: pod_admin
--

CREATE FUNCTION public.get_random_string(length integer) RETURNS text
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN substr(md5(random()::text), 1, length);
END; $$;


ALTER FUNCTION public.get_random_string(length integer) OWNER TO pod_admin;

--
-- Name: is_valid_public_id(text); Type: FUNCTION; Schema: public; Owner: pod_admin
--

CREATE FUNCTION public.is_valid_public_id(value text) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN value SIMILAR TO '0x[0-9a-fA-F]{40}';
END; $$;


ALTER FUNCTION public.is_valid_public_id(value text) OWNER TO pod_admin;

--
-- Name: update_last_modified_column(); Type: FUNCTION; Schema: public; Owner: pod_admin
--

CREATE FUNCTION public.update_last_modified_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.last_modified := NOW();
  RETURN NEW;
END; $$;


ALTER FUNCTION public.update_last_modified_column() OWNER TO pod_admin;

--
-- Name: withdraw(integer, public.account, integer, integer); Type: FUNCTION; Schema: public; Owner: pod_admin
--

CREATE FUNCTION public.withdraw(_from_user_id integer, _to public.account, _asset_id integer, _amount integer) RETURNS integer
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


ALTER FUNCTION public.withdraw(_from_user_id integer, _to public.account, _asset_id integer, _amount integer) OWNER TO pod_admin;

SET default_tablespace = '';

SET default_with_oids = false;

--
-- Name: account_types; Type: TABLE; Schema: public; Owner: pod_admin
--

CREATE TABLE public.account_types (
    name text NOT NULL
);


ALTER TABLE public.account_types OWNER TO pod_admin;

--
-- Name: assets; Type: TABLE; Schema: public; Owner: pod_admin
--

CREATE TABLE public.assets (
    id integer NOT NULL,
    subreddit text NOT NULL,
    name_singular text NOT NULL,
    name_plural text NOT NULL,
    symbol text NOT NULL,
    creation_time timestamp with time zone DEFAULT now() NOT NULL,
    abi text NOT NULL
);


ALTER TABLE public.assets OWNER TO pod_admin;

--
-- Name: assets_id_seq; Type: SEQUENCE; Schema: public; Owner: pod_admin
--

CREATE SEQUENCE public.assets_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.assets_id_seq OWNER TO pod_admin;

--
-- Name: assets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: pod_admin
--

ALTER SEQUENCE public.assets_id_seq OWNED BY public.assets.id;


--
-- Name: balances; Type: TABLE; Schema: public; Owner: pod_admin
--

CREATE TABLE public.balances (
    user_id integer NOT NULL,
    asset_id integer NOT NULL,
    balance integer NOT NULL,
    last_modified timestamp with time zone DEFAULT now() NOT NULL,
    deposit_limit integer DEFAULT '-1'::integer NOT NULL,
    CONSTRAINT balances_deposit_limit_check CHECK ((deposit_limit >= '-1'::integer)),
    CONSTRAINT balances_last_modified_check CHECK ((date_part('timezone'::text, last_modified) = (0)::double precision))
);


ALTER TABLE public.balances OWNER TO pod_admin;

--
-- Name: contracts; Type: TABLE; Schema: public; Owner: pod_admin
--

CREATE TABLE public.contracts (
    asset_id integer NOT NULL,
    chain_id integer NOT NULL,
    address public.citext NOT NULL
);


ALTER TABLE public.contracts OWNER TO pod_admin;

--
-- Name: csrf_tokens; Type: TABLE; Schema: public; Owner: pod_admin
--

CREATE TABLE public.csrf_tokens (
    token text NOT NULL,
    creation_time timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.csrf_tokens OWNER TO pod_admin;

--
-- Name: db_patches; Type: TABLE; Schema: public; Owner: pod_admin
--

CREATE TABLE public.db_patches (
    hash bytea NOT NULL,
    applied_time timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT db_patches_applied_time_check CHECK ((date_part('timezone'::text, applied_time) = (0)::double precision))
);


ALTER TABLE public.db_patches OWNER TO pod_admin;

--
-- Name: deliveries; Type: TABLE; Schema: public; Owner: pod_admin
--

CREATE TABLE public.deliveries (
    id integer NOT NULL,
    reddit_message_id text NOT NULL,
    from_user_id integer NOT NULL,
    asset_id integer NOT NULL,
    deposited_amount integer NOT NULL,
    sent_time timestamp with time zone NOT NULL,
    received_time timestamp with time zone DEFAULT now() NOT NULL,
    excess integer NOT NULL,
    CONSTRAINT deliveries_received_time_check CHECK ((date_part('timezone'::text, received_time) = (0)::double precision)),
    CONSTRAINT deliveries_sent_time_check CHECK ((date_part('timezone'::text, sent_time) = (0)::double precision))
);


ALTER TABLE public.deliveries OWNER TO pod_admin;

--
-- Name: deliveries_id_seq; Type: SEQUENCE; Schema: public; Owner: pod_admin
--

CREATE SEQUENCE public.deliveries_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.deliveries_id_seq OWNER TO pod_admin;

--
-- Name: deliveries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: pod_admin
--

ALTER SEQUENCE public.deliveries_id_seq OWNED BY public.deliveries.id;


--
-- Name: erc20_deposit_ids; Type: TABLE; Schema: public; Owner: pod_admin
--

CREATE TABLE public.erc20_deposit_ids (
    deposit_id public.citext DEFAULT (('0x10'::text || public.get_random_string(6)) || replace((public.uuid_generate_v4())::text, '-'::text, ''::text)) NOT NULL,
    user_id integer NOT NULL
);


ALTER TABLE public.erc20_deposit_ids OWNER TO pod_admin;

--
-- Name: erc20_deposits; Type: TABLE; Schema: public; Owner: pod_admin
--

CREATE TABLE public.erc20_deposits (
    id integer NOT NULL,
    asset_id integer NOT NULL,
    transaction public.citext NOT NULL,
    from_address public.citext NOT NULL,
    to_user integer NOT NULL,
    amount integer NOT NULL,
    received_time timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT erc20_deposits_received_time_check CHECK ((date_part('timezone'::text, received_time) = (0)::double precision))
);


ALTER TABLE public.erc20_deposits OWNER TO pod_admin;

--
-- Name: erc20_deposits_id_seq; Type: SEQUENCE; Schema: public; Owner: pod_admin
--

CREATE SEQUENCE public.erc20_deposits_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.erc20_deposits_id_seq OWNER TO pod_admin;

--
-- Name: erc20_deposits_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: pod_admin
--

ALTER SEQUENCE public.erc20_deposits_id_seq OWNED BY public.erc20_deposits.id;


--
-- Name: manually_applied_patches; Type: TABLE; Schema: public; Owner: pod_admin
--

CREATE TABLE public.manually_applied_patches (
    id text NOT NULL,
    applied_time timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT manually_applied_patches_applied_time_check CHECK ((date_part('timezone'::text, applied_time) = (0)::double precision))
);


ALTER TABLE public.manually_applied_patches OWNER TO pod_admin;

--
-- Name: nonces; Type: TABLE; Schema: public; Owner: pod_admin
--

CREATE TABLE public.nonces (
    address public.citext NOT NULL,
    next integer NOT NULL
);


ALTER TABLE public.nonces OWNER TO pod_admin;

--
-- Name: queued_transactions; Type: TABLE; Schema: public; Owner: pod_admin
--

CREATE TABLE public.queued_transactions (
    id integer NOT NULL,
    _from public.citext NOT NULL,
    gas_limit public.citext NOT NULL,
    _to public.citext NOT NULL,
    value public.citext NOT NULL,
    data public.citext NOT NULL,
    chain_id integer NOT NULL,
    processed boolean DEFAULT false NOT NULL,
    transaction_id public.citext DEFAULT ''::public.citext NOT NULL,
    creation_time timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.queued_transactions OWNER TO pod_admin;

--
-- Name: queued_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: pod_admin
--

CREATE SEQUENCE public.queued_transactions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.queued_transactions_id_seq OWNER TO pod_admin;

--
-- Name: queued_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: pod_admin
--

ALTER SEQUENCE public.queued_transactions_id_seq OWNED BY public.queued_transactions.id;


--
-- Name: reddit_accounts; Type: TABLE; Schema: public; Owner: pod_admin
--

CREATE TABLE public.reddit_accounts (
    username public.citext NOT NULL,
    user_id integer NOT NULL,
    creation_time timestamp with time zone DEFAULT now() NOT NULL,
    access_token text,
    refresh_token text,
    access_token_expiration timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.reddit_accounts OWNER TO pod_admin;

--
-- Name: sessions; Type: TABLE; Schema: public; Owner: pod_admin
--

CREATE TABLE public.sessions (
    token text NOT NULL,
    user_id integer NOT NULL,
    expiration timestamp with time zone NOT NULL,
    creation_time timestamp with time zone DEFAULT now() NOT NULL,
    active boolean DEFAULT true NOT NULL
);


ALTER TABLE public.sessions OWNER TO pod_admin;

--
-- Name: users; Type: TABLE; Schema: public; Owner: pod_admin
--

CREATE TABLE public.users (
    id integer NOT NULL,
    creation_time timestamp with time zone DEFAULT now() NOT NULL,
    public_id public.citext DEFAULT ('0x00000000'::text || replace((public.uuid_generate_v4())::text, '-'::text, ''::text)) NOT NULL,
    erc20_withdrawal_limit integer DEFAULT 5 NOT NULL,
    CONSTRAINT users_public_id_check CHECK (public.is_valid_public_id((public_id)::text))
);


ALTER TABLE public.users OWNER TO pod_admin;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: pod_admin
--

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.users_id_seq OWNER TO pod_admin;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: pod_admin
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: vars; Type: TABLE; Schema: public; Owner: pod_admin
--

CREATE TABLE public.vars (
    key text NOT NULL,
    value text NOT NULL
);


ALTER TABLE public.vars OWNER TO pod_admin;

--
-- Name: withdrawals; Type: TABLE; Schema: public; Owner: pod_admin
--

CREATE TABLE public.withdrawals (
    id integer NOT NULL,
    from_user_id integer NOT NULL,
    recipient public.account,
    asset_id integer NOT NULL,
    amount integer NOT NULL,
    transaction_id text,
    creation_time timestamp with time zone DEFAULT now() NOT NULL,
    success boolean DEFAULT true NOT NULL
);


ALTER TABLE public.withdrawals OWNER TO pod_admin;

--
-- Name: withdrawals_id_seq; Type: SEQUENCE; Schema: public; Owner: pod_admin
--

CREATE SEQUENCE public.withdrawals_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.withdrawals_id_seq OWNER TO pod_admin;

--
-- Name: withdrawals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: pod_admin
--

ALTER SEQUENCE public.withdrawals_id_seq OWNED BY public.withdrawals.id;


--
-- Name: assets id; Type: DEFAULT; Schema: public; Owner: pod_admin
--

ALTER TABLE ONLY public.assets ALTER COLUMN id SET DEFAULT nextval('public.assets_id_seq'::regclass);


--
-- Name: deliveries id; Type: DEFAULT; Schema: public; Owner: pod_admin
--

ALTER TABLE ONLY public.deliveries ALTER COLUMN id SET DEFAULT nextval('public.deliveries_id_seq'::regclass);


--
-- Name: erc20_deposits id; Type: DEFAULT; Schema: public; Owner: pod_admin
--

ALTER TABLE ONLY public.erc20_deposits ALTER COLUMN id SET DEFAULT nextval('public.erc20_deposits_id_seq'::regclass);


--
-- Name: queued_transactions id; Type: DEFAULT; Schema: public; Owner: pod_admin
--

ALTER TABLE ONLY public.queued_transactions ALTER COLUMN id SET DEFAULT nextval('public.queued_transactions_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: pod_admin
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: withdrawals id; Type: DEFAULT; Schema: public; Owner: pod_admin
--

ALTER TABLE ONLY public.withdrawals ALTER COLUMN id SET DEFAULT nextval('public.withdrawals_id_seq'::regclass);


--
-- Name: account_types account_types_pkey; Type: CONSTRAINT; Schema: public; Owner: pod_admin
--

ALTER TABLE ONLY public.account_types
    ADD CONSTRAINT account_types_pkey PRIMARY KEY (name);


--
-- Name: assets assets_pkey; Type: CONSTRAINT; Schema: public; Owner: pod_admin
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_pkey PRIMARY KEY (id);


--
-- Name: assets assets_subreddit_key; Type: CONSTRAINT; Schema: public; Owner: pod_admin
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_subreddit_key UNIQUE (subreddit);


--
-- Name: contracts contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: pod_admin
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_pkey PRIMARY KEY (asset_id, chain_id);


--
-- Name: csrf_tokens csrf_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: pod_admin
--

ALTER TABLE ONLY public.csrf_tokens
    ADD CONSTRAINT csrf_tokens_pkey PRIMARY KEY (token);


--
-- Name: db_patches db_patches_pkey; Type: CONSTRAINT; Schema: public; Owner: pod_admin
--

ALTER TABLE ONLY public.db_patches
    ADD CONSTRAINT db_patches_pkey PRIMARY KEY (hash);


--
-- Name: deliveries deliveries_pkey; Type: CONSTRAINT; Schema: public; Owner: pod_admin
--

ALTER TABLE ONLY public.deliveries
    ADD CONSTRAINT deliveries_pkey PRIMARY KEY (id);


--
-- Name: deliveries deliveries_reddit_message_id_key; Type: CONSTRAINT; Schema: public; Owner: pod_admin
--

ALTER TABLE ONLY public.deliveries
    ADD CONSTRAINT deliveries_reddit_message_id_key UNIQUE (reddit_message_id);


--
-- Name: erc20_deposits erc20_deposits_pkey; Type: CONSTRAINT; Schema: public; Owner: pod_admin
--

ALTER TABLE ONLY public.erc20_deposits
    ADD CONSTRAINT erc20_deposits_pkey PRIMARY KEY (id);


--
-- Name: manually_applied_patches manually_applied_patches_pkey; Type: CONSTRAINT; Schema: public; Owner: pod_admin
--

ALTER TABLE ONLY public.manually_applied_patches
    ADD CONSTRAINT manually_applied_patches_pkey PRIMARY KEY (id);


--
-- Name: nonces nonces_pkey; Type: CONSTRAINT; Schema: public; Owner: pod_admin
--

ALTER TABLE ONLY public.nonces
    ADD CONSTRAINT nonces_pkey PRIMARY KEY (address);


--
-- Name: queued_transactions queued_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: pod_admin
--

ALTER TABLE ONLY public.queued_transactions
    ADD CONSTRAINT queued_transactions_pkey PRIMARY KEY (id);


--
-- Name: reddit_accounts reddit_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: pod_admin
--

ALTER TABLE ONLY public.reddit_accounts
    ADD CONSTRAINT reddit_accounts_pkey PRIMARY KEY (username);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: pod_admin
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (token);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: pod_admin
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_public_id_key; Type: CONSTRAINT; Schema: public; Owner: pod_admin
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_public_id_key UNIQUE (public_id);


--
-- Name: vars vars_pkey; Type: CONSTRAINT; Schema: public; Owner: pod_admin
--

ALTER TABLE ONLY public.vars
    ADD CONSTRAINT vars_pkey PRIMARY KEY (key);


--
-- Name: withdrawals withdrawals_pkey; Type: CONSTRAINT; Schema: public; Owner: pod_admin
--

ALTER TABLE ONLY public.withdrawals
    ADD CONSTRAINT withdrawals_pkey PRIMARY KEY (id);


--
-- Name: balances update_balances_last_modified; Type: TRIGGER; Schema: public; Owner: pod_admin
--

CREATE TRIGGER update_balances_last_modified BEFORE UPDATE ON public.balances FOR EACH ROW EXECUTE PROCEDURE public.update_last_modified_column();


--
-- Name: balances balances_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pod_admin
--

ALTER TABLE ONLY public.balances
    ADD CONSTRAINT balances_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id);


--
-- Name: balances balances_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pod_admin
--

ALTER TABLE ONLY public.balances
    ADD CONSTRAINT balances_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: contracts contracts_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pod_admin
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id);


--
-- Name: deliveries deliveries_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pod_admin
--

ALTER TABLE ONLY public.deliveries
    ADD CONSTRAINT deliveries_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id);


--
-- Name: deliveries deliveries_from_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pod_admin
--

ALTER TABLE ONLY public.deliveries
    ADD CONSTRAINT deliveries_from_user_id_fkey FOREIGN KEY (from_user_id) REFERENCES public.users(id);


--
-- Name: erc20_deposit_ids erc20_deposit_ids_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pod_admin
--

ALTER TABLE ONLY public.erc20_deposit_ids
    ADD CONSTRAINT erc20_deposit_ids_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: erc20_deposits erc20_deposits_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pod_admin
--

ALTER TABLE ONLY public.erc20_deposits
    ADD CONSTRAINT erc20_deposits_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id);


--
-- Name: erc20_deposits erc20_deposits_to_user_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pod_admin
--

ALTER TABLE ONLY public.erc20_deposits
    ADD CONSTRAINT erc20_deposits_to_user_fkey FOREIGN KEY (to_user) REFERENCES public.users(id);


--
-- Name: reddit_accounts reddit_accounts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pod_admin
--

ALTER TABLE ONLY public.reddit_accounts
    ADD CONSTRAINT reddit_accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pod_admin
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: withdrawals withdrawals_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pod_admin
--

ALTER TABLE ONLY public.withdrawals
    ADD CONSTRAINT withdrawals_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id);


--
-- Name: withdrawals withdrawals_from_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pod_admin
--

ALTER TABLE ONLY public.withdrawals
    ADD CONSTRAINT withdrawals_from_user_id_fkey FOREIGN KEY (from_user_id) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--


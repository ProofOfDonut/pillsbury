CREATE TABLE queued_transactions (
    id serial NOT NULL PRIMARY KEY,
    _from citext NOT NULL,
    gas_limit citext NOT NULL,
    _to citext NOT NULL,
    value citext NOT NULL,
    data citext NOT NULL,
    chain_id int NOT NULL,
    processed boolean NOT NULL DEFAULT FALSE,
    transaction_id citext NOT NULL DEFAULT '',
    creation_time timestamptz NOT NULL DEFAULT now());

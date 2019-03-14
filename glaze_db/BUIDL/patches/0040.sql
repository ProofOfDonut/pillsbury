CREATE TYPE event_type AS ENUM (
    'api_endpoint',
    'api_endpoint_error');

CREATE TABLE event_logs (
    id serial NOT NULL PRIMARY KEY,
    type event_type NOT NULL,
    data text NOT NULL,
    creation_time timestamptz NOT NULL DEFAULT now());


CREATE TABLE user_terms (
    id serial NOT NULL PRIMARY KEY,
    title text NOT NULL,
    value text NOT NULL,
    accept_label text NOT NULL);

CREATE TABLE accepted_user_terms (
    user_id int NOT NULL REFERENCES users (id),
    user_term_id int NOT NULL REFERENCES user_terms (id),
    creation_time timestamptz NOT NULL DEFAULT NOW());

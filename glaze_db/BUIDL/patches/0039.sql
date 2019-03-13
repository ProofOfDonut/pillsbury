CREATE TABLE role_permissions (
    role text NOT NULL,
    permission text NOT NULL,
    PRIMARY KEY (role, permission));

INSERT INTO role_permissions (role, permission)
    VALUES ('admin', 'edit_user_terms');

CREATE TABLE user_roles (
    user_id int NOT NULL REFERENCES users (id),
    role text NOT NULL,
    PRIMARY KEY (user_id, role));

ALTER TABLE user_terms
    ADD COLUMN deleted boolean NOT NULL DEFAULT FALSE;


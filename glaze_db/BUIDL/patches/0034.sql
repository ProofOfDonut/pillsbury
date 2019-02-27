CREATE TABLE subreddits (
    id serial NOT NULL PRIMARY KEY,
    subreddit citext NOT NULL,
    reddit_id text NOT NULL);

INSERT INTO subreddits
    (subreddit, reddit_id)
    VALUES ('ethtrader', '37jgj');

CREATE TABLE subreddit_balance_logs (
    subreddit_id int NOT NULL REFERENCES subreddits (id),
    amount int NOT NULL,
    expected_amount int NOT NULL,
    creation_time timestamptz NOT NULL DEFAULT NOW());

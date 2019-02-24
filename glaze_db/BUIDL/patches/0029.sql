ALTER TABLE users
    ALTER COLUMN erc20_withdrawal_limit SET DEFAULT 10;

UPDATE users
    SET erc20_withdrawal_limit = 10;

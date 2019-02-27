-- This is the amount of existing supply of ERC-20 tokens.
SELECT
    (SELECT coalesce(sum(amount), 0)
        FROM withdrawals
        WHERE asset_id = 1
            AND (recipient).type = 'ethereum_address'
            AND success)
    - (SELECT coalesce(sum(amount), 0) FROM erc20_deposits WHERE asset_id = 1);

-- This is the number of Reddit donuts that the bridge accounts are expected to
-- be holding.
SELECT (
    SELECT coalesce(sum(deposited_amount), 0)
        FROM deliveries
        WHERE asset_id = 1)
    - (SELECT coalesce(sum(amount), 0)
        FROM withdrawals
        WHERE asset_id = 1
            AND (recipient).type = 'reddit_user'
            AND success);

-- Compare user balances to the expected amount based on deposits and
-- withdrawals. This number should be 0.
SELECT
    -- Amount deposited and held by the bridge accounts
    (SELECT
        (SELECT coalesce(sum(deposited_amount), 0)
            FROM deliveries
            WHERE asset_id = 1)
        - (SELECT coalesce(sum(amount), 0)
            FROM withdrawals
            WHERE asset_id = 1
                AND (recipient).type = 'reddit_user'
                AND success))
    -- Amount minted on the blockchain
    - (SELECT
        (SELECT coalesce(sum(amount), 0)
            FROM withdrawals
            WHERE asset_id = 1
                AND (recipient).type = 'ethereum_address'
                AND success)
        - (SELECT coalesce(sum(amount), 0)
            FROM erc20_deposits
            WHERE asset_id = 1))
    -- Amount held in user accounts
    - (SELECT coalesce(sum(balance), 0)
        FROM balances
        WHERE asset_id = 1);

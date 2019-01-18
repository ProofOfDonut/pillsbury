-- This is the amount of existing supply of ERC-20 tokens.
SELECT
    (SELECT sum(amount)
        FROM withdrawals
        WHERE asset_id = 1
            AND (recipient).type = 'ethereum_address'
            AND success)
    - (SELECT sum(amount) FROM erc20_deposits WHERE asset_id = 1);

-- This is the number of donuts that /u/ProofOfDonut is expected to be holding.
SELECT
    (SELECT sum(deposited_amount) FROM deliveries WHERE asset_id = 1)
    - (SELECT sum(amount)
        FROM withdrawals
        WHERE asset_id = 1
            AND (recipient).type = 'reddit_user'
            AND success);

-- Compare user balances to the expected amount based on deposits and
-- withdrawals. This number should be 0.
SELECT
    -- Amount deposited and held by /u/ProofOfDonut
    (SELECT
        (SELECT sum(deposited_amount) FROM deliveries WHERE asset_id = 1)
        - (SELECT sum(amount)
            FROM withdrawals
            WHERE asset_id = 1
                AND (recipient).type = 'reddit_user'
                AND success))
    -- Amount minted on the blockchain
    - (SELECT
        (SELECT sum(amount)
            FROM withdrawals
            WHERE asset_id = 1
                AND (recipient).type = 'ethereum_address'
                AND success)
        - (SELECT sum(amount) FROM erc20_deposits WHERE asset_id = 1))
    -- Amount held in user accounts
    - (SELECT sum(balance) FROM balances WHERE asset_id = 1);

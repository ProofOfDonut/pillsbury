SELECT u.id, ra.username, ra.creation_time, b.balance, u.erc20_withdrawal_limit
    FROM users u
    FULL JOIN reddit_accounts ra
        ON ra.user_id = u.id
    FULL JOIN balances b
        ON b.user_id = u.id
    ORDER BY u.id ASC;

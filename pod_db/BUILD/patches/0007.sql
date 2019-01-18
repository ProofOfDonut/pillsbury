DO LANGUAGE plpgsql $$
DECLARE
  _id int;
BEGIN
  SELECT id
      INTO _id
      FROM assets
      WHERE subreddit = 'ethtrader'
          AND name_singular = 'Donut'
          AND name_plural = 'Donuts'
          AND symbol = 'DONUT'
          LIMIT 1;

  UPDATE contracts
      SET address = '0xd496e7ebb649738c8493afe2966e48c4e693a79a'
      WHERE asset_id = _id;
END; $$;

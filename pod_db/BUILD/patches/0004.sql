CREATE TABLE nonces (
    address citext NOT NULL PRIMARY KEY,
    next int NOT NULL);

CREATE FUNCTION get_next_nonce(
    _address citext)
    RETURNS int
    LANGUAGE plpgsql
    AS $$
DECLARE
  _next int;
BEGIN
  LOCK nonces IN ROW EXCLUSIVE MODE;
  IF _address LIKE '^0x[\da-fA-F]+$' THEN
    RAISE EXCEPTION 'Invalid address %', _address;
  END IF;
  SELECT next INTO _next FROM nonces WHERE address = _address;
  IF _next IS NULL THEN
    _next = 0;
    INSERT INTO nonces (address, next) VALUES (_address, _next + 1);
  ELSE
    UPDATE nonces SET next = _next + 1 WHERE address = _address;
  END IF;
  RETURN _next;
END; $$;

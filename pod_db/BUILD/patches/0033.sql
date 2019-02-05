ALTER TABLE refunds
    ADD column id serial NOT NULL,
    ADD COLUMN success boolean NOT NULL DEFAULT TRUE;

UPDATE assets
    SET name_singular = 'donut',
        name_plural = 'donuts'
    WHERE symbol = 'DONUT';

INSERT INTO manually_applied_patches (id)
    VALUES ('0033');

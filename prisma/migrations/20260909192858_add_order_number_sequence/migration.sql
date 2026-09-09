-- A dedicated sequence for human-facing order numbers ("AZH-2026-000042").
-- Postgres sequences are atomic across concurrent transactions by design
-- (nextval() never returns the same value twice, even under heavy
-- concurrency, without taking a row lock that would serialize checkouts) —
-- exactly the guarantee "read current max, add one" can't give without a
-- retry-on-conflict loop.
CREATE SEQUENCE IF NOT EXISTS "order_number_seq" START WITH 1;

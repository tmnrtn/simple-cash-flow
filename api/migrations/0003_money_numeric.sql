-- Money was stored as REAL (float4), which is inexact for decimals and only
-- holds ~7 significant digits — sums accumulate rounding error. NUMERIC is
-- exact. The cast rounds each float back to the intended 2-dp value.
ALTER TABLE transaction ALTER COLUMN amount TYPE NUMERIC(12,2);
ALTER TABLE balance ALTER COLUMN balance_amount TYPE NUMERIC(12,2);

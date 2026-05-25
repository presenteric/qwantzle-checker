-- cf/schema_sweep.sql — Cloudflare D1 additions for the Pass 1 sweep.
--
-- These tables are the cloud-side mirror of the local DuckDB sweep state.
-- Apply with:
--   wrangler d1 execute qwantzle-db --remote --file=cf/schema_sweep.sql
--
-- See CF-SWEEP-DESIGN.md for the architecture. The existing tables in
-- cf/schema.sql (attempts, visits, ryan_events) are untouched — those serve
-- the public site analytics. These sweep_* tables serve the bulk DFS sweep.
--
-- All DDL uses CREATE … IF NOT EXISTS so this file is idempotent.

-- ---------------------------------------------------------------------------
-- 1. The authoritative triplet list. Seeded ONCE from the local DuckDB
--    triplets table (which itself comes from triplets_by_anchor/*.csv.gz).
--    ~12.3M rows. ~150 bytes/row → ~1.85 GB.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sweep_triplets (
  eleven         TEXT NOT NULL,
  eight          TEXT NOT NULL,
  w_word         TEXT NOT NULL,
  leftover_count INTEGER NOT NULL,
  rare_count     INTEGER NOT NULL,
  score          REAL    NOT NULL,
  rare_letters   TEXT,
  leftover_str   TEXT,
  PRIMARY KEY (eleven, eight, w_word)
);
CREATE INDEX IF NOT EXISTS idx_swt_score ON sweep_triplets(score DESC);
CREATE INDEX IF NOT EXISTS idx_swt_rare  ON sweep_triplets(rare_count);
CREATE INDEX IF NOT EXISTS idx_swt_eight ON sweep_triplets(eight);
CREATE INDEX IF NOT EXISTS idx_swt_w_word ON sweep_triplets(w_word);

-- ---------------------------------------------------------------------------
-- 2. Per-triplet exploration state. Mirrors local triplet_status, with
--    additional fields for worker coordination (worker_id, claimed_at).
--    Most rows will be created lazily as workers touch the triplet — we do
--    NOT pre-populate with all 12.3M 'untested' rows. The default for
--    untouched triplets is implicit: absence of a row means status='untested'.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sweep_status (
  eleven       TEXT NOT NULL,
  eight        TEXT NOT NULL,
  w_word       TEXT NOT NULL,
  status       TEXT NOT NULL,    -- 'in_flight' | 'diff_zero_found' | 'infeasible_no_diff0' | 'error' | 'skipped'
  worker_id    TEXT,
  claimed_at   INTEGER,           -- unix ms
  notes        TEXT,
  last_touched INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER) * 1000),
  PRIMARY KEY (eleven, eight, w_word)
);
CREATE INDEX IF NOT EXISTS idx_sws_status  ON sweep_status(status);
CREATE INDEX IF NOT EXISTS idx_sws_claimed ON sweep_status(claimed_at);

-- ---------------------------------------------------------------------------
-- 3. Every diff=0 (or close-miss) sentence the sweep produces.
--    Cloud equivalent of local sentence_attempts.
--    Each diff=0 hit is ~250 bytes. At average 50 diff=0 per feasible triplet
--    × 30% feasibility × 12.3M triplets → ~46 GB. Will likely exceed D1's
--    10GB ceiling, so we cap stored attempts at top-N per triplet during the
--    DFS itself (see CF-SWEEP-DESIGN.md cost section).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sweep_attempts (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  eleven       TEXT NOT NULL,
  eight        TEXT NOT NULL,
  w_word       TEXT NOT NULL,
  sentence     TEXT NOT NULL,
  diff         INTEGER,
  surplus      TEXT,
  deficit      TEXT,
  worker_id    TEXT,
  pass         TEXT NOT NULL,            -- 'dfs' | 'llm_refine'
  created_at   INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER) * 1000)
);
CREATE INDEX IF NOT EXISTS idx_swa_triplet ON sweep_attempts(eleven, eight, w_word);
CREATE INDEX IF NOT EXISTS idx_swa_diff    ON sweep_attempts(diff);
CREATE INDEX IF NOT EXISTS idx_swa_pass    ON sweep_attempts(pass);

-- ---------------------------------------------------------------------------
-- 4. Per-triplet per-pass summary. Cloud equivalent of local triplet_sweep_log.
--    One row per (triplet, pass) execution. Lets us compute throughput,
--    infeasibility rate, etc. without touching sweep_attempts.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sweep_log (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  eleven            TEXT NOT NULL,
  eight             TEXT NOT NULL,
  w_word            TEXT NOT NULL,
  sweep_pass        TEXT NOT NULL,        -- 'dfs' | 'coherence' | 'llm_refine'
  diff0_count       INTEGER NOT NULL,
  fillings_explored INTEGER NOT NULL,
  elapsed_ms        INTEGER NOT NULL,
  dfs_cap           INTEGER,
  worker_id         TEXT,
  notes             TEXT,
  swept_at          INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER) * 1000)
);
CREATE INDEX IF NOT EXISTS idx_sl_pass     ON sweep_log(sweep_pass);
CREATE INDEX IF NOT EXISTS idx_sl_diff0    ON sweep_log(diff0_count);
CREATE INDEX IF NOT EXISTS idx_sl_when     ON sweep_log(swept_at DESC);
CREATE INDEX IF NOT EXISTS idx_sl_triplet  ON sweep_log(eleven, eight, w_word);

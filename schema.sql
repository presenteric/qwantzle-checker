CREATE TABLE IF NOT EXISTS attempts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  ts          INTEGER NOT NULL,
  session     TEXT,
  sentence    TEXT NOT NULL,
  diff        INTEGER,
  surplus     TEXT,
  deficit     TEXT,
  word_count  INTEGER,
  all_pass    INTEGER,
  eleven      TEXT,
  eight       TEXT,
  ending      TEXT
);

CREATE INDEX IF NOT EXISTS idx_attempts_ts      ON attempts(ts);
CREATE INDEX IF NOT EXISTS idx_attempts_diff    ON attempts(diff);
CREATE INDEX IF NOT EXISTS idx_attempts_eleven  ON attempts(eleven);
CREATE INDEX IF NOT EXISTS idx_attempts_session ON attempts(session);

CREATE TABLE IF NOT EXISTS ryan_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS visits (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  ts       INTEGER NOT NULL,
  referrer TEXT  -- hostname only, e.g. "bsky.app", "t.co", or NULL for direct
);

CREATE INDEX IF NOT EXISTS idx_visits_ts ON visits(ts);
CREATE INDEX IF NOT EXISTS idx_visits_referrer ON visits(referrer);

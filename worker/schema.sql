CREATE TABLE IF NOT EXISTS users (
  telegram_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  pending_inviter_id INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS referrals (
  invited_user_id INTEGER PRIMARY KEY,
  inviter_id INTEGER NOT NULL,
  invited_name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (inviter_id) REFERENCES users(telegram_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_inviter
ON referrals(inviter_id);


CREATE TABLE IF NOT EXISTS user_bonuses (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  remaining_amount DECIMAL(10, 2) NOT NULL,
  rollover_amount DECIMAL(10, 2) NOT NULL,
  rolled_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  expires_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  related_transaction_id INTEGER REFERENCES payment_transactions(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

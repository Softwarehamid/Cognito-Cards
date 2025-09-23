-- AI Quotas and Usage Tracking Schema
-- This migration adds user-specific AI usage quotas and tracking

-- Create ai_quotas table for tracking user AI usage
CREATE TABLE IF NOT EXISTS ai_quotas (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  credits_tokens int NOT NULL DEFAULT 20000, -- 20k free starter credits (~15k words)
  used_tokens int NOT NULL DEFAULT 0,
  period_start timestamptz NOT NULL DEFAULT now(),
  ai_enabled boolean NOT NULL DEFAULT false, -- AI opt-in, default OFF
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user settings table for AI preferences
CREATE TABLE IF NOT EXISTS user_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  ai_generation_enabled boolean NOT NULL DEFAULT false, -- Default AI OFF
  notifications_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create AI usage log for detailed tracking
CREATE TABLE IF NOT EXISTS ai_usage_log (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider_used text NOT NULL, -- 'openai', 'gemini', etc.
  tokens_used int NOT NULL,
  prompt_hash text, -- For caching duplicate requests
  cards_generated int DEFAULT 0,
  cost_estimate numeric(10,6) DEFAULT 0, -- Track estimated costs
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE ai_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_quotas
CREATE POLICY "Users can view own quota"
  ON ai_quotas
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own quota"
  ON ai_quotas
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own quota"
  ON ai_quotas
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_settings
CREATE POLICY "Users can view own settings"
  ON user_settings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON user_settings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON user_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for ai_usage_log
CREATE POLICY "Users can view own usage log"
  ON ai_usage_log
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert usage log"
  ON ai_usage_log
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Function to initialize user quota and settings on signup
CREATE OR REPLACE FUNCTION public.initialize_user_ai_settings()
RETURNS trigger AS $$
BEGIN
  -- Create default quota entry
  INSERT INTO public.ai_quotas (user_id, credits_tokens, used_tokens, ai_enabled)
  VALUES (NEW.id, 20000, 0, false); -- Default AI OFF
  
  -- Create default settings entry
  INSERT INTO public.user_settings (user_id, ai_generation_enabled)
  VALUES (NEW.id, false); -- Default AI OFF
  
  RETURN NEW;
END;
$$ language plpgsql security definer;

-- Trigger to auto-initialize settings for new users
DROP TRIGGER IF EXISTS on_auth_user_created_ai_settings ON auth.users;
CREATE TRIGGER on_auth_user_created_ai_settings
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.initialize_user_ai_settings();

-- Function to reset monthly quotas (run via cron)
CREATE OR REPLACE FUNCTION public.reset_monthly_ai_quotas()
RETURNS void AS $$
BEGIN
  UPDATE ai_quotas 
  SET 
    used_tokens = 0,
    period_start = now()
  WHERE period_start < now() - interval '30 days';
END;
$$ language plpgsql security definer;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_quotas_user_id ON ai_quotas(user_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_user_id ON ai_usage_log(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_created_at ON ai_usage_log(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_prompt_hash ON ai_usage_log(prompt_hash);

-- Updated timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language plpgsql;

-- Add updated_at triggers
DROP TRIGGER IF EXISTS update_ai_quotas_updated_at ON ai_quotas;
CREATE TRIGGER update_ai_quotas_updated_at
  BEFORE UPDATE ON ai_quotas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
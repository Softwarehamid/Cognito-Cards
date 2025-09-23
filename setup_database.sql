-- Complete Database Setup for AI FlashCard App
-- Copy and paste this entire script into your Supabase SQL Editor

-- 1. Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name text DEFAULT '',
  avatar_url text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read and update own profile"
  ON profiles
  FOR ALL
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Public can read display_name and avatar_url"
  ON profiles
  FOR SELECT
  TO anon
  USING (true);

-- Function to handle user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, display_name, avatar_url)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'display_name', ''),
    COALESCE(new.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 2. Create decks table
CREATE TABLE IF NOT EXISTS decks (
  id bigserial PRIMARY KEY,
  owner uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text DEFAULT '',
  tags text[] DEFAULT '{}',
  is_public boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE decks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners have full access to their decks"
  ON decks
  FOR ALL
  TO authenticated
  USING (auth.uid() = owner)
  WITH CHECK (auth.uid() = owner);

CREATE POLICY "Public can read public decks"
  ON decks
  FOR SELECT
  TO anon, authenticated
  USING (is_public = true);

-- 3. Create flashcards table
CREATE TABLE IF NOT EXISTS flashcards (
  id bigserial PRIMARY KEY,
  deck_id bigint REFERENCES decks ON DELETE CASCADE NOT NULL,
  front_text text DEFAULT '',
  back_text text DEFAULT '',
  front_image_url text,
  back_image_url text,
  hint text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Access flashcards when deck owner matches auth.uid()"
  ON flashcards
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM decks 
      WHERE decks.id = flashcards.deck_id 
      AND decks.owner = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM decks 
      WHERE decks.id = flashcards.deck_id 
      AND decks.owner = auth.uid()
    )
  );

CREATE POLICY "Read flashcards when parent deck is public"
  ON flashcards
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM decks 
      WHERE decks.id = flashcards.deck_id 
      AND decks.is_public = true
    )
  );

-- 4. Create reviews table for spaced repetition
CREATE TABLE IF NOT EXISTS reviews (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  flashcard_id bigint REFERENCES flashcards ON DELETE CASCADE NOT NULL,
  quality integer NOT NULL CHECK (quality >= 0 AND quality <= 5),
  previous_interval integer DEFAULT 0,
  new_interval integer DEFAULT 1,
  easiness_factor real DEFAULT 2.5,
  reviewed_at timestamptz DEFAULT now(),
  next_review_at timestamptz DEFAULT now()
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their own reviews"
  ON reviews
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5. Create study_sessions table
CREATE TABLE IF NOT EXISTS study_sessions (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  deck_id bigint REFERENCES decks ON DELETE CASCADE NOT NULL,
  cards_studied integer DEFAULT 0,
  correct_answers integer DEFAULT 0,
  session_duration_seconds integer DEFAULT 0,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their own study sessions"
  ON study_sessions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 6. Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers to tables
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_decks_updated_at ON decks;
CREATE TRIGGER update_decks_updated_at BEFORE UPDATE ON decks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_flashcards_updated_at ON flashcards;
CREATE TRIGGER update_flashcards_updated_at BEFORE UPDATE ON flashcards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
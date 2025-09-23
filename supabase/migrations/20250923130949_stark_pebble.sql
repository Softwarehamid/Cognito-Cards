/*
  # Create study_sessions table

  1. New Tables
    - `study_sessions`
      - `id` (bigserial, primary key)
      - `user_id` (uuid, references auth.users)
      - `deck_id` (bigint, references decks)
      - `started_at` (timestamptz, default now)
      - `ended_at` (timestamptz, optional)
      - `total_reviewed` (int, default 0)
      - `correct` (int, default 0)

  2. Security
    - Enable RLS on `study_sessions` table
    - Add policy for user_id equals auth.uid() only
*/

CREATE TABLE IF NOT EXISTS study_sessions (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  deck_id bigint REFERENCES decks ON DELETE CASCADE NOT NULL,
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  total_reviewed int DEFAULT 0,
  correct int DEFAULT 0
);

ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own study sessions"
  ON study_sessions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
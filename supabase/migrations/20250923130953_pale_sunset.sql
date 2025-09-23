/*
  # Create reviews table

  1. New Tables
    - `reviews`
      - `id` (bigserial, primary key)
      - `user_id` (uuid, references auth.users)
      - `flashcard_id` (bigint, references flashcards)
      - `reviewed_at` (timestamptz, default now)
      - `response_quality` (int, check between 0 and 5)
      - `ease` (real, default 2.5)
      - `interval_days` (int, default 0)
      - `next_due_date` (date)

  2. Security
    - Enable RLS on `reviews` table
    - Add policy for user_id equals auth.uid() only
*/

CREATE TABLE IF NOT EXISTS reviews (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  flashcard_id bigint REFERENCES flashcards ON DELETE CASCADE NOT NULL,
  reviewed_at timestamptz DEFAULT now(),
  response_quality int CHECK (response_quality BETWEEN 0 AND 5),
  ease real DEFAULT 2.5,
  interval_days int DEFAULT 0,
  next_due_date date
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own reviews"
  ON reviews
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for performance
CREATE INDEX IF NOT EXISTS reviews_user_next_due_idx ON reviews(user_id, next_due_date);
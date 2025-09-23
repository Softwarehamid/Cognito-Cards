/*
  # Create flashcards table

  1. New Tables
    - `flashcards`
      - `id` (bigserial, primary key)
      - `deck_id` (bigint, references decks)
      - `front_text` (text, default empty)
      - `back_text` (text, default empty)
      - `front_image_url` (text, optional)
      - `back_image_url` (text, optional)
      - `hint` (text, default empty)
      - `created_at` (timestamptz, default now)
      - `updated_at` (timestamptz, default now)

  2. Security
    - Enable RLS on `flashcards` table
    - Add policy for access when deck owner matches auth.uid()
    - Add policy for read access when parent deck is public
*/

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
/*
  # Create decks table

  1. New Tables
    - `decks`
      - `id` (bigserial, primary key)
      - `owner` (uuid, references auth.users)
      - `title` (text, not null)
      - `description` (text, default empty)
      - `tags` (text array, default empty)
      - `is_public` (boolean, default false)
      - `created_at` (timestamptz, default now)
      - `updated_at` (timestamptz, default now)

  2. Security
    - Enable RLS on `decks` table
    - Add policy for owners to have full access
    - Add policy for public read access when is_public is true
*/

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
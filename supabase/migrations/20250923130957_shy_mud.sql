/*
  # Create imports table

  1. New Tables
    - `imports`
      - `id` (bigserial, primary key)
      - `user_id` (uuid, references auth.users)
      - `source_type` (text, check in paste/pdf/youtube/csv)
      - `source_meta` (jsonb, default empty object)
      - `status` (text, default pending, check in pending/done/error)
      - `created_at` (timestamptz, default now)
      - `error_message` (text, default empty)

  2. Security
    - Enable RLS on `imports` table
    - Add policy for user_id equals auth.uid() only
*/

CREATE TABLE IF NOT EXISTS imports (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  source_type text CHECK (source_type IN ('paste', 'pdf', 'youtube', 'csv')),
  source_meta jsonb DEFAULT '{}',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'error')),
  created_at timestamptz DEFAULT now(),
  error_message text DEFAULT ''
);

ALTER TABLE imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own imports"
  ON imports
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
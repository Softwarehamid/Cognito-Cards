/*
  # Create sample public deck with flashcards

  1. Sample Data
    - Create a sample public deck for onboarding
    - Add 5 sample flashcards to demonstrate functionality
    - Only run in development environment
*/

-- Insert sample deck (this will only work if there's at least one user)
DO $$
DECLARE
  sample_deck_id bigint;
  admin_user_id uuid;
BEGIN
  -- Try to get the first user as admin (for development only)
  SELECT id INTO admin_user_id FROM auth.users LIMIT 1;
  
  IF admin_user_id IS NOT NULL THEN
    -- Create sample deck
    INSERT INTO decks (owner, title, description, tags, is_public)
    VALUES (
      admin_user_id,
      'Introduction to Learning',
      'Master the fundamentals of effective learning techniques',
      ARRAY['learning', 'study-skills', 'education', 'beginner'],
      true
    )
    RETURNING id INTO sample_deck_id;

    -- Create sample flashcards
    INSERT INTO flashcards (deck_id, front_text, back_text, hint) VALUES
    (sample_deck_id, 'What is spaced repetition?', 'A learning technique that involves reviewing material at increasing intervals to improve long-term retention.', 'Think about timing and memory'),
    (sample_deck_id, 'What does "active recall" mean?', 'The practice of actively retrieving information from memory rather than passively reviewing notes.', 'Active vs passive learning'),
    (sample_deck_id, 'What is the Feynman Technique?', 'A method of learning by explaining concepts in simple terms as if teaching someone else.', 'Named after physicist Richard Feynman'),
    (sample_deck_id, 'Why is sleep important for learning?', 'Sleep consolidates memories, transferring information from short-term to long-term memory storage.', 'Think about memory consolidation'),
    (sample_deck_id, 'What is metacognition?', 'The awareness and understanding of one''s own thought processes - "thinking about thinking".', 'Meta means "beyond" or "about"');
  END IF;
END $$;
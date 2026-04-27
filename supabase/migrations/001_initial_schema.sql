-- RANDORI PRO Arcade — initiales Schema
-- Profiles, Highscores, RLS, Trigger für Auto-Profil, View top_scores

-- Spieler-Profile (erweitert auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  favorite_game TEXT,
  total_play_time INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Highscores
CREATE TABLE public.highscores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  game TEXT NOT NULL CHECK (game IN ('snake', 'tetris', 'sudoku', 'space-invaders')),
  score INTEGER NOT NULL,
  level INTEGER DEFAULT 1,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_highscores_game_score ON public.highscores(game, score DESC);
CREATE INDEX idx_highscores_user ON public.highscores(user_id);

-- Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.highscores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles sind öffentlich lesbar"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "User können eigenes Profil ändern"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "User können eigenes Profil erstellen"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Highscores sind öffentlich lesbar"
  ON public.highscores FOR SELECT USING (true);

CREATE POLICY "Eingeloggte User können eigene Highscores erstellen"
  ON public.highscores FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Trigger: Profil bei Registrierung anlegen
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'Kaempfer_' || LEFT(NEW.id::TEXT, 8)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'Neuer Kämpfer')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- View: Top-Scores pro Spiel mit Rang
CREATE OR REPLACE VIEW public.top_scores AS
SELECT
  h.id,
  h.game,
  h.score,
  h.level,
  h.created_at,
  p.username,
  p.display_name,
  ROW_NUMBER() OVER (PARTITION BY h.game ORDER BY h.score DESC) AS rank
FROM public.highscores h
JOIN public.profiles p ON h.user_id = p.id;

GRANT SELECT ON public.top_scores TO anon, authenticated;

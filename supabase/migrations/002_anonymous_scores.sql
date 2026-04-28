-- 002: Anonymes Highscore-Speichern (per eingegebenem Namen, ohne Login)
--
-- Diese Migration entfernt die Login-Voraussetzung für Highscore-Einträge.
-- Spieler tragen ihren Namen nach dem Spiel ein, der Score wird ohne Auth
-- gespeichert. Das Profile-System bleibt unverändert (kann in Zukunft wieder
-- genutzt werden).

-- 1. Alte Insert-Policy entfernen (auth.uid()-basiert)
DROP POLICY IF EXISTS "Eingeloggte User können eigene Highscores erstellen"
  ON public.highscores;

-- 2. user_id darf jetzt NULL sein, FK lockern (ON DELETE SET NULL)
ALTER TABLE public.highscores ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.highscores DROP CONSTRAINT IF EXISTS highscores_user_id_fkey;
ALTER TABLE public.highscores
  ADD CONSTRAINT highscores_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.profiles(id)
  ON DELETE SET NULL;

-- 3. Direkte display_name-Spalte für anonyme Einträge
ALTER TABLE public.highscores
  ADD COLUMN IF NOT EXISTS display_name TEXT;

-- 4. Konsistenz-Check: entweder user_id ODER display_name muss vorhanden sein
ALTER TABLE public.highscores
  DROP CONSTRAINT IF EXISTS highscores_has_identity;
ALTER TABLE public.highscores
  ADD CONSTRAINT highscores_has_identity
  CHECK (user_id IS NOT NULL OR display_name IS NOT NULL);

-- 5. Public-Insert-Policy: jeder darf einen Score eintragen
CREATE POLICY "Highscores öffentlich erstellbar"
  ON public.highscores FOR INSERT
  TO anon, authenticated
  WITH CHECK (display_name IS NOT NULL OR user_id = auth.uid());

-- 6. Top-Scores View neu (mit COALESCE — bevorzugt direkter display_name,
--    fällt zurück auf Profile)
DROP VIEW IF EXISTS public.top_scores;
CREATE OR REPLACE VIEW public.top_scores AS
SELECT
  h.id,
  h.game,
  h.score,
  h.level,
  h.created_at,
  COALESCE(h.display_name, p.username, 'Anonym') AS username,
  COALESCE(h.display_name, p.display_name, p.username, 'Anonym') AS display_name,
  ROW_NUMBER() OVER (PARTITION BY h.game ORDER BY h.score DESC) AS rank
FROM public.highscores h
LEFT JOIN public.profiles p ON h.user_id = p.id;

GRANT SELECT ON public.top_scores TO anon, authenticated;

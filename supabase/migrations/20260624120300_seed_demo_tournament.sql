-- =============================================================================
-- Acabalo Profe — Demo Tournament Seed
-- Migration: 20260624120300_seed_demo_tournament.sql
-- =============================================================================
-- Seeds one "Mundial Demo 2026" tournament for development.
-- 8 groups (A-H), 32 teams, group stage + knockout bracket.
-- All matches scheduled in the future (relative to NOW()) so the
-- app has fresh data to test against.
-- =============================================================================

-- Tournament
INSERT INTO public.tournaments (id, name, slug, logo_url, start_date, end_date, status)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Mundial Demo 2026',
  'mundial-demo-2026',
  NULL,
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '60 days',
  'active'
)
ON CONFLICT (id) DO NOTHING;

-- Phases (6: groups, R16, QF, SF, 3rd place, final)
INSERT INTO public.phases (id, tournament_id, name, type, order_index) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Fase de Grupos', 'group_stage', 1),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Octavos de Final', 'knockout', 2),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Cuartos de Final', 'knockout', 3),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Semifinales', 'knockout', 4),
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'Tercer Puesto', 'knockout', 5),
  ('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'Final', 'knockout', 6)
ON CONFLICT (id) DO NOTHING;

-- Teams (32 across 8 groups)
-- Group A
INSERT INTO public.teams (id, tournament_id, name, short_name, flag_url, group_name) VALUES
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Argentina', 'ARG', '🇦🇷', 'Grupo A'),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Brasil',     'BRA', '🇧🇷', 'Grupo A'),
  ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Chile',      'CHI', '🇨🇱', 'Grupo A'),
  ('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Uruguay',    'URU', '🇺🇾', 'Grupo A'),
-- Group B
  ('20000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'Colombia',   'COL', '🇨🇴', 'Grupo B'),
  ('20000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'Perú',       'PER', '🇵🇪', 'Grupo B'),
  ('20000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'Ecuador',    'ECU', '🇪🇨', 'Grupo B'),
  ('20000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'Venezuela',  'VEN', '🇻🇪', 'Grupo B'),
-- Group C
  ('20000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', 'México',         'MEX', '🇲🇽', 'Grupo C'),
  ('20000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'Estados Unidos', 'USA', '🇺🇸', 'Grupo C'),
  ('20000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'Costa Rica',     'CRC', '🇨🇷', 'Grupo C'),
  ('20000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'Panamá',         'PAN', '🇵🇦', 'Grupo C'),
-- Group D
  ('20000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001', 'España',     'ESP', '🇪🇸', 'Grupo D'),
  ('20000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000001', 'Paraguay',   'PAR', '🇵🇾', 'Grupo D'),
  ('20000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000001', 'Bolivia',    'BOL', '🇧🇴', 'Grupo D'),
  ('20000000-0000-0000-0000-000000000016', '00000000-0000-0000-0000-000000000001', 'Guatemala',  'GUA', '🇬🇹', 'Grupo D'),
-- Group E
  ('20000000-0000-0000-0000-000000000017', '00000000-0000-0000-0000-000000000001', 'Francia',         'FRA', '🇫🇷', 'Grupo E'),
  ('20000000-0000-0000-0000-000000000018', '00000000-0000-0000-0000-000000000001', 'Alemania',        'GER', '🇩🇪', 'Grupo E'),
  ('20000000-0000-0000-0000-000000000019', '00000000-0000-0000-0000-000000000001', 'Portugal',        'POR', '🇵🇹', 'Grupo E'),
  ('20000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001', 'Países Bajos',    'NED', '🇳🇱', 'Grupo E'),
-- Group F
  ('20000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000001', 'Bélgica',     'BEL', '🇧🇪', 'Grupo F'),
  ('20000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000001', 'Croacia',     'CRO', '🇭🇷', 'Grupo F'),
  ('20000000-0000-0000-0000-000000000023', '00000000-0000-0000-0000-000000000001', 'Suiza',       'SUI', '🇨🇭', 'Grupo F'),
  ('20000000-0000-0000-0000-000000000024', '00000000-0000-0000-0000-000000000001', 'Austria',     'AUT', '🇦🇹', 'Grupo F'),
-- Group G
  ('20000000-0000-0000-0000-000000000025', '00000000-0000-0000-0000-000000000001', 'Japón',       'JPN', '🇯🇵', 'Grupo G'),
  ('20000000-0000-0000-0000-000000000026', '00000000-0000-0000-0000-000000000001', 'Corea del Sur','KOR', '🇰🇷', 'Grupo G'),
  ('20000000-0000-0000-0000-000000000027', '00000000-0000-0000-0000-000000000001', 'Irán',        'IRN', '🇮🇷', 'Grupo G'),
  ('20000000-0000-0000-0000-000000000028', '00000000-0000-0000-0000-000000000001', 'Australia',   'AUS', '🇦🇺', 'Grupo G'),
-- Group H
  ('20000000-0000-0000-0000-000000000029', '00000000-0000-0000-0000-000000000001', 'Marruecos',   'MAR', '🇲🇦', 'Grupo H'),
  ('20000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000001', 'Senegal',     'SEN', '🇸🇳', 'Grupo H'),
  ('20000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000001', 'Nigeria',     'NGA', '🇳🇬', 'Grupo H'),
  ('20000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000001', 'Egipto',      'EGY', '🇪🇬', 'Grupo H')
ON CONFLICT (id) DO NOTHING;

-- Group stage matches: 3 matchdays × 8 groups × 2 matches = 48 matches
-- Pattern: in each group, on each matchday, 2 matches (team1 vs team2, team3 vs team4
-- on matchday 1; team1 vs team3, team2 vs team4 on matchday 2; team1 vs team4, team2 vs team3 on matchday 3).
-- Scheduled across 9 days starting 2 days from now.

DO $$
DECLARE
  group_letters TEXT[] := ARRAY['A','B','C','D','E','F','G','H'];
  g TEXT;
  md INTEGER;
  match_num INTEGER := 0;
  t1 UUID;
  t2 UUID;
  t3 UUID;
  t4 UUID;
  base_offset INTERVAL;
  scheduled TIMESTAMPTZ;
  group_base UUID;
  team_base INTEGER;
  match_id UUID;
BEGIN
  base_offset := INTERVAL '2 days';

  FOREACH g IN ARRAY group_letters LOOP
    -- Each group has 4 teams at IDs (20000000-...-XXX)
    -- Group A: 001,002,003,004; Group B: 005,006,007,008; etc.
    team_base := (CASE g
      WHEN 'A' THEN 1 WHEN 'B' THEN 5 WHEN 'C' THEN 9 WHEN 'D' THEN 13
      WHEN 'E' THEN 17 WHEN 'F' THEN 21 WHEN 'G' THEN 25 WHEN 'H' THEN 29
    END);

    t1 := ('20000000-0000-0000-0000-00000000' || lpad(team_base::TEXT, 4, '0'))::UUID;
    t2 := ('20000000-0000-0000-0000-00000000' || lpad((team_base+1)::TEXT, 4, '0'))::UUID;
    t3 := ('20000000-0000-0000-0000-00000000' || lpad((team_base+2)::TEXT, 4, '0'))::UUID;
    t4 := ('20000000-0000-0000-0000-00000000' || lpad((team_base+3)::TEXT, 4, '0'))::UUID;

    FOR md IN 1..3 LOOP
      match_num := match_num + 1;
      scheduled := NOW() + base_offset + ((match_num - 1) * INTERVAL '4 hours');

      -- MD1: t1-t2, t3-t4 / MD2: t1-t3, t2-t4 / MD3: t1-t4, t2-t3
      -- Match 1 of matchday
      match_id := gen_random_uuid();
      IF md = 1 THEN
        INSERT INTO public.matches (id, tournament_id, phase_id, home_team_id, away_team_id, scheduled_at, is_knockout, matchday)
        VALUES (match_id, '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', t1, t2, scheduled, FALSE, 'Fecha ' || md);
      ELSIF md = 2 THEN
        INSERT INTO public.matches (id, tournament_id, phase_id, home_team_id, away_team_id, scheduled_at, is_knockout, matchday)
        VALUES (match_id, '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', t1, t3, scheduled, FALSE, 'Fecha ' || md);
      ELSE
        INSERT INTO public.matches (id, tournament_id, phase_id, home_team_id, away_team_id, scheduled_at, is_knockout, matchday)
        VALUES (match_id, '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', t1, t4, scheduled, FALSE, 'Fecha ' || md);
      END IF;

      -- Match 2 of matchday
      match_num := match_num + 1;
      scheduled := NOW() + base_offset + ((match_num - 1) * INTERVAL '4 hours');
      match_id := gen_random_uuid();
      IF md = 1 THEN
        INSERT INTO public.matches (id, tournament_id, phase_id, home_team_id, away_team_id, scheduled_at, is_knockout, matchday)
        VALUES (match_id, '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', t3, t4, scheduled, FALSE, 'Fecha ' || md);
      ELSIF md = 2 THEN
        INSERT INTO public.matches (id, tournament_id, phase_id, home_team_id, away_team_id, scheduled_at, is_knockout, matchday)
        VALUES (match_id, '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', t2, t4, scheduled, FALSE, 'Fecha ' || md);
      ELSE
        INSERT INTO public.matches (id, tournament_id, phase_id, home_team_id, away_team_id, scheduled_at, is_knockout, matchday)
        VALUES (match_id, '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', t2, t3, scheduled, FALSE, 'Fecha ' || md);
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- Knockout matches: 8 R16, 4 QF, 2 SF, 1 3rd place, 1 final
-- For the demo we use placeholder teams (the first 2 of each group)
-- and schedule them progressively. Real bracket population (Fase 3) will
-- replace home_team_id/away_team_id based on group stage results.

-- Round of 16 (matchdays 1-2, days 12-14)
INSERT INTO public.matches (id, tournament_id, phase_id, home_team_id, away_team_id, scheduled_at, is_knockout, matchday)
SELECT
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  -- Placeholder: first team of each group
  ('20000000-0000-0000-0000-00000000' || lpad(((g-1)*4+1)::TEXT, 4, '0'))::UUID,
  ('20000000-0000-0000-0000-00000000' || lpad(((g-1)*4+2)::TEXT, 4, '0'))::UUID,
  NOW() + INTERVAL '12 days' + (g * INTERVAL '3 hours'),
  TRUE,
  'Octavos ' || g
FROM generate_series(1, 8) AS g;

-- Quarter-finals (4 matches, day 18)
INSERT INTO public.matches (id, tournament_id, phase_id, home_team_id, away_team_id, scheduled_at, is_knockout, matchday)
SELECT
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000003',
  ('20000000-0000-0000-0000-00000000' || lpad(((g-1)*2+1)::TEXT, 4, '0'))::UUID,
  ('20000000-0000-0000-0000-00000000' || lpad(((g-1)*2+3)::TEXT, 4, '0'))::UUID,
  NOW() + INTERVAL '18 days' + (g * INTERVAL '3 hours'),
  TRUE,
  'Cuartos ' || g
FROM generate_series(1, 4) AS g;

-- Semi-finals (2 matches, day 24)
INSERT INTO public.matches (id, tournament_id, phase_id, home_team_id, away_team_id, scheduled_at, is_knockout, matchday)
SELECT
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000004',
  ('20000000-0000-0000-0000-00000000' || lpad(g::TEXT, 4, '0'))::UUID,
  ('20000000-0000-0000-0000-00000000' || lpad((g+1)::TEXT, 4, '0'))::UUID,
  NOW() + INTERVAL '24 days' + (g * INTERVAL '3 hours'),
  TRUE,
  'Semifinal ' || g
FROM generate_series(1, 2) AS g;

-- Third place (day 28)
INSERT INTO public.matches (id, tournament_id, phase_id, home_team_id, away_team_id, scheduled_at, is_knockout, matchday)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000005',
  '20000000-0000-0000-0000-000000000003',
  '20000000-0000-0000-0000-000000000004',
  NOW() + INTERVAL '28 days',
  TRUE,
  'Tercer Puesto'
);

-- Final (day 30)
INSERT INTO public.matches (id, tournament_id, phase_id, home_team_id, away_team_id, scheduled_at, is_knockout, matchday)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000006',
  '20000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000002',
  NOW() + INTERVAL '30 days',
  TRUE,
  'Final'
);

-- =============================================================================
-- End of seed
-- =============================================================================

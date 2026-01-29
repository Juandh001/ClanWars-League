-- Script para sincronizar TODAS las estadísticas de guerreros automáticamente
-- Basado en los datos reales de match_participants
-- Ejecutar en Supabase SQL Editor

-- Actualizar todas las estadísticas de guerreros basándose en match_participants
UPDATE profiles p
SET
  warrior_wins = COALESCE(stats.wins, 0),
  warrior_losses = COALESCE(stats.losses, 0)
FROM (
  SELECT
    user_id,
    SUM(CASE WHEN team = 'winner' THEN 1 ELSE 0 END) as wins,
    SUM(CASE WHEN team = 'loser' THEN 1 ELSE 0 END) as losses
  FROM match_participants
  GROUP BY user_id
) stats
WHERE p.id = stats.user_id;

-- También resetear a 0 los jugadores que no tienen participaciones pero tienen stats
UPDATE profiles
SET warrior_wins = 0, warrior_losses = 0
WHERE id NOT IN (SELECT DISTINCT user_id FROM match_participants)
  AND (warrior_wins > 0 OR warrior_losses > 0);

-- Verificar resultados
SELECT
  p.nickname,
  p.warrior_wins,
  p.warrior_losses,
  p.warrior_wins + p.warrior_losses as total_matches
FROM profiles p
WHERE p.warrior_wins > 0 OR p.warrior_losses > 0
ORDER BY p.warrior_wins + p.warrior_losses DESC;

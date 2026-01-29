-- Script para sincronizar estadísticas de guerreros con match_participants
-- Ejecutar en Supabase SQL Editor

-- 1. Actualizar test5: perfil 1W/1L -> real 1W/2L
UPDATE profiles
SET warrior_wins = 1, warrior_losses = 2
WHERE id = '0aa6e40c-6348-47b6-a49e-d33ef23050fc';

-- 2. Actualizar Jhonny: perfil 0W/2L -> real 1W/2L
UPDATE profiles
SET warrior_wins = 1, warrior_losses = 2
WHERE id = '38b30f0d-c5cd-4f36-8602-256b9938041d';

-- 3. Actualizar test2: perfil 1W/1L -> real 2W/1L
UPDATE profiles
SET warrior_wins = 2, warrior_losses = 1
WHERE id = '2f990cd3-ca8d-44e7-ae03-b200c508b605';

-- 4. Actualizar demon: perfil 0W/2L -> real 0W/1L
UPDATE profiles
SET warrior_wins = 0, warrior_losses = 1
WHERE id = '4a3cb50c-e54e-460b-b01d-c9718f6b7a02';

-- Verificar los cambios
SELECT id, nickname, warrior_wins, warrior_losses
FROM profiles
WHERE id IN (
  '0aa6e40c-6348-47b6-a49e-d33ef23050fc',
  '38b30f0d-c5cd-4f36-8602-256b9938041d',
  '2f990cd3-ca8d-44e7-ae03-b200c508b605',
  '4a3cb50c-e54e-460b-b01d-c9718f6b7a02'
);

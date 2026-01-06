-- ==================== MISE À JOUR PERSONALINFO ====================
-- Ce script met à jour la structure de personalInfo pour tous les utilisateurs existants
-- Ajoute les champs gameId, phone, et discord s'ils manquent

USE we01io_blackwood;

-- Mettre à jour l'admin
UPDATE users 
SET personalInfo = JSON_SET(
    COALESCE(personalInfo, '{}'),
    '$.gameId', COALESCE(JSON_EXTRACT(personalInfo, '$.gameId'), ''),
    '$.phone', COALESCE(JSON_EXTRACT(personalInfo, '$.phone'), ''),
    '$.discord', COALESCE(JSON_EXTRACT(personalInfo, '$.discord'), ''),
    '$.age', COALESCE(JSON_EXTRACT(personalInfo, '$.age'), ''),
    '$.address', COALESCE(JSON_EXTRACT(personalInfo, '$.address'), '')
)
WHERE id = 'admin-001';

-- Mettre à jour l'employé
UPDATE users 
SET personalInfo = JSON_SET(
    COALESCE(personalInfo, '{}'),
    '$.gameId', COALESCE(JSON_EXTRACT(personalInfo, '$.gameId'), ''),
    '$.phone', COALESCE(JSON_EXTRACT(personalInfo, '$.phone'), ''),
    '$.discord', COALESCE(JSON_EXTRACT(personalInfo, '$.discord'), ''),
    '$.age', COALESCE(JSON_EXTRACT(personalInfo, '$.age'), ''),
    '$.address', COALESCE(JSON_EXTRACT(personalInfo, '$.address'), '')
)
WHERE id = 'employee-001';

-- Mettre à jour le client de test avec des données d'exemple
UPDATE users 
SET personalInfo = JSON_SET(
    COALESCE(personalInfo, '{}'),
    '$.firstName', COALESCE(JSON_EXTRACT(personalInfo, '$.firstName'), 'Test'),
    '$.lastName', COALESCE(JSON_EXTRACT(personalInfo, '$.lastName'), 'Client'),
    '$.gameId', COALESCE(JSON_EXTRACT(personalInfo, '$.gameId'), '12345'),
    '$.phone', COALESCE(JSON_EXTRACT(personalInfo, '$.phone'), '0612345678'),
    '$.discord', COALESCE(JSON_EXTRACT(personalInfo, '$.discord'), 'test#1234'),
    '$.age', COALESCE(JSON_EXTRACT(personalInfo, '$.age'), '30'),
    '$.address', COALESCE(JSON_EXTRACT(personalInfo, '$.address'), '123 Rue Test')
)
WHERE id = 'client-001';

-- Mettre à jour tous les autres utilisateurs pour ajouter les champs manquants
UPDATE users 
SET personalInfo = JSON_SET(
    COALESCE(personalInfo, '{}'),
    '$.gameId', COALESCE(JSON_EXTRACT(personalInfo, '$.gameId'), ''),
    '$.phone', COALESCE(JSON_EXTRACT(personalInfo, '$.phone'), ''),
    '$.discord', COALESCE(JSON_EXTRACT(personalInfo, '$.discord'), '')
)
WHERE id NOT IN ('admin-001', 'employee-001', 'client-001')
  AND personalInfo IS NOT NULL;

SELECT 'Mise à jour terminée avec succès !' as status;

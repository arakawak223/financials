-- ≥ÛµÎ∆£Û∞mím.k˝†
INSERT INTO industries (name, created_at, updated_at)
VALUES ('≥ÛµÎ∆£Û∞m', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- ∫ç(hm.íh:
SELECT * FROM industries ORDER BY name;

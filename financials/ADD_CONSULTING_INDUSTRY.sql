-- コンサルティング業を業種に追加
INSERT INTO industries (name, created_at, updated_at)
VALUES ('コンサルティング業', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- 確認用：全業種を表示
SELECT * FROM industries ORDER BY name;

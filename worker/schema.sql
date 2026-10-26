-- قاعدة «نَسيج» على Cloudflare D1
CREATE TABLE IF NOT EXISTS records(coll TEXT, id TEXT, data TEXT, ts INTEGER, deleted INTEGER DEFAULT 0, seq INTEGER, by_user TEXT, center TEXT, project TEXT, PRIMARY KEY(coll,id));
CREATE INDEX IF NOT EXISTS rec_seq ON records(seq);
CREATE TABLE IF NOT EXISTS users(email TEXT PRIMARY KEY, name TEXT, title TEXT, role TEXT, centers TEXT DEFAULT '[]', assignments TEXT DEFAULT '[]', active INTEGER DEFAULT 1, last_login INTEGER);
CREATE TABLE IF NOT EXISTS policy(k TEXT PRIMARY KEY, v TEXT);
CREATE TABLE IF NOT EXISTS meta(k TEXT PRIMARY KEY, v INTEGER);
CREATE TABLE IF NOT EXISTS audit(at INTEGER, user TEXT, action TEXT, detail TEXT);
CREATE INDEX IF NOT EXISTS aud_at ON audit(at);
INSERT OR IGNORE INTO meta VALUES('seq',0);

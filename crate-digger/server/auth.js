import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';
import { HttpError } from './store.js';

const SESSION_DAYS = 60;

export function hashPassword(pw) {
  const salt = randomBytes(16);
  const hash = scryptSync(pw, salt, 64);
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}
export function verifyPassword(pw, stored) {
  const [, s, h] = String(stored).split('$');
  if (!s || !h) return false;
  const want = Buffer.from(h, 'base64');
  const got = scryptSync(pw, Buffer.from(s, 'base64'), want.length);
  return timingSafeEqual(want, got);
}

export function createAuth(db, store) {
  const q = (sql) => db.prepare(sql);
  function validate(username, password) {
    const u = String(username || '').trim();
    if (!/^[\w.\-]{3,32}$/.test(u)) throw new HttpError(400, 'Username must be 3–32 letters, numbers, dots, dashes or underscores');
    if (String(password || '').length < 8) throw new HttpError(400, 'Password must be at least 8 characters');
    return u;
  }
  function newSession(userId) {
    const token = randomBytes(32).toString('base64url');
    q('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, userId, Date.now() + SESSION_DAYS * 864e5);
    q('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
    return token;
  }
  return {
    register(username, password) {
      const u = validate(username, password);
      if (q('SELECT 1 FROM users WHERE username = ?').get(u)) throw new HttpError(409, 'That username is taken');
      const id = Number(q('INSERT INTO users (username, pass_hash) VALUES (?, ?)').run(u, hashPassword(password)).lastInsertRowid);
      store.seedGenres(id);
      return { user: { id, username: u }, token: newSession(id) };
    },
    login(username, password) {
      const row = q('SELECT * FROM users WHERE username = ?').get(String(username || '').trim());
      if (!row || !verifyPassword(String(password || ''), row.pass_hash)) throw new HttpError(401, 'Wrong username or password');
      return { user: { id: row.id, username: row.username }, token: newSession(row.id) };
    },
    logout(token) { q('DELETE FROM sessions WHERE token = ?').run(token); },
    userFor(token) {
      if (!token) return null;
      const row = q('SELECT u.id, u.username, s.expires_at FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?').get(token);
      if (!row || row.expires_at < Date.now()) return null;
      return { id: row.id, username: row.username };
    },
    changePassword(userId, current, next) {
      const row = q('SELECT pass_hash FROM users WHERE id = ?').get(userId);
      if (!verifyPassword(String(current || ''), row.pass_hash)) throw new HttpError(401, 'Current password is wrong');
      if (String(next || '').length < 8) throw new HttpError(400, 'New password must be at least 8 characters');
      q('UPDATE users SET pass_hash = ? WHERE id = ?').run(hashPassword(next), userId);
    },
    deleteAccount(userId, password) {
      const row = q('SELECT pass_hash FROM users WHERE id = ?').get(userId);
      if (!verifyPassword(String(password || ''), row.pass_hash)) throw new HttpError(401, 'Password is wrong');
      q('DELETE FROM users WHERE id = ?').run(userId);
    },
    userCount() { return q('SELECT COUNT(*) AS n FROM users').get().n; },
  };
}

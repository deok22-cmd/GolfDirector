/**
 * 골프총무 백엔드 - 인증 (이메일+비밀번호 → bcrypt 해시 + JWT)
 * 비밀번호 평문은 저장하지 않는다. JWT_SECRET 은 .env 에서.
 */
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "./db.js";

const SECRET = process.env.JWT_SECRET || "dev-insecure-secret-change-me";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function httpErr(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}
const publicUser = (u) => ({ id: u.id, email: u.email });
const sign = (u) => jwt.sign({ uid: u.id }, SECRET, { expiresIn: "60d" });

export function register({ email, password }) {
  if (!EMAIL_RE.test(email || "")) throw httpErr(400, "이메일 형식이 올바르지 않습니다.");
  if (!password || String(password).length < 6)
    throw httpErr(400, "비밀번호는 6자 이상이어야 합니다.");
  if (db.findUserByEmail(email)) throw httpErr(409, "이미 가입된 이메일입니다.");
  const passwordHash = bcrypt.hashSync(String(password), 10);
  const user = db.createUser({ email, passwordHash });
  return { token: sign(user), user: publicUser(user) };
}

export function login({ email, password }) {
  const user = db.findUserByEmail(email || "");
  if (!user || !bcrypt.compareSync(String(password || ""), user.passwordHash)) {
    throw httpErr(401, "이메일 또는 비밀번호가 올바르지 않습니다.");
  }
  return { token: sign(user), user: publicUser(user) };
}

// 보호된 라우트용 미들웨어: 유효한 토큰이면 req.userId 설정
export function authMiddleware(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  try {
    const payload = jwt.verify(token, SECRET);
    req.userId = payload.uid;
    next();
  } catch {
    res.status(401).json({ error: "로그인이 필요합니다." });
  }
}

export { publicUser };

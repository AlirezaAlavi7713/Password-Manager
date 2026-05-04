import jwt from "jsonwebtoken";

export const AUTH_COOKIE = "pm_token";
export const TWO_FA_COOKIE = "pm_2fa_token";

const AUTH_MAX_AGE = 12 * 60 * 60 * 1000;
const TWO_FA_MAX_AGE = 5 * 60 * 1000;

export const authCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: AUTH_MAX_AGE,
};

export const twoFaCookieOptions = {
  ...authCookieOptions,
  maxAge: TWO_FA_MAX_AGE,
};

export const clearCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
};

export const signAuthToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "12h" });

export const signTwoFaToken = (payload) =>
  jwt.sign({ ...payload, pending2fa: true }, process.env.JWT_SECRET, { expiresIn: "5m" });

export const verifyToken = (token) => jwt.verify(token, process.env.JWT_SECRET);

export const readCookie = (cookieHeader, name) => {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(";").map((cookie) => cookie.trim().split("="));
  const match = cookies.find(([key]) => key === name);
  return match ? decodeURIComponent(match.slice(1).join("=")) : null;
};

export const getBearerToken = (authorizationHeader) =>
  authorizationHeader?.startsWith("Bearer ")
    ? authorizationHeader.split(" ")[1]
    : null;

export const getAuthTokenFromRequest = (req) =>
  getBearerToken(req.headers.authorization) || readCookie(req.headers.cookie, AUTH_COOKIE);

export const setAuthCookie = (res, payload) => {
  res.cookie(AUTH_COOKIE, signAuthToken(payload), authCookieOptions);
};

export const setTwoFaCookie = (res, payload) => {
  res.cookie(TWO_FA_COOKIE, signTwoFaToken(payload), twoFaCookieOptions);
};

export const clearAuthCookie = (res) => {
  res.clearCookie(AUTH_COOKIE, clearCookieOptions);
};

export const clearTwoFaCookie = (res) => {
  res.clearCookie(TWO_FA_COOKIE, clearCookieOptions);
};

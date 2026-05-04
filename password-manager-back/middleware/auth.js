import { getAuthTokenFromRequest, verifyToken } from "../utils/authTokens.js";

export const auth = (req, res, next) => {
  const token = getAuthTokenFromRequest(req);
  if (!token) return res.status(401).json({ message: "Token manquant" });
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ message: "Token invalide" });
  }
};

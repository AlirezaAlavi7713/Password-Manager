import { Router } from "express";
import { body } from "express-validator";
import { rateLimit } from "express-rate-limit";
import { register, login, me, getSaltForEmail, patchProfile, changeMasterPassword, logout } from "../controllers/authController.js";
import { setup2fa, enable2fa, disable2fa, verifyLogin2fa } from "../controllers/twoFaController.js";
import { auth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Trop de tentatives, réessayez dans 15 minutes." },
});

const saltLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: "Trop de requêtes, réessayez dans 15 minutes." },
});

const registerRules = [
  body("nom").trim().notEmpty().withMessage("Le nom est requis"),
  body("prenom").trim().notEmpty().withMessage("Le prénom est requis"),
  body("email").isEmail().withMessage("Email invalide").normalizeEmail(),
  body("auth_key_hash").isLength({ min: 32 }).withMessage("Clé d'authentification invalide"),
  body("pbkdf2_salt").isLength({ min: 16 }).withMessage("Sel invalide"),
];

const saltRules = [
  body("email").isEmail().withMessage("Email invalide").normalizeEmail(),
];

const loginRules = [
  body("email").isEmail().withMessage("Email invalide").normalizeEmail(),
  body("auth_key_hash").notEmpty().withMessage("Clé d'authentification requise"),
];

router.post("/register", registerRules, validate, register);
router.post("/salt", saltLimiter, saltRules, validate, getSaltForEmail);
router.post("/login", loginLimiter, loginRules, validate, login);
router.post("/logout", logout);
router.get("/me", auth, me);
router.patch("/profile", auth, patchProfile);
router.post("/change-password", auth, changeMasterPassword);

// ── 2FA ──
router.get("/2fa/setup",        auth, setup2fa);
router.post("/2fa/enable",      auth, enable2fa);
router.post("/2fa/disable",     auth, disable2fa);
router.post("/2fa/verify-login", verifyLogin2fa);

export default router;

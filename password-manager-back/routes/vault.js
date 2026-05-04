import { Router } from "express";
import { body } from "express-validator";
import { getEntries, addEntry, editEntry, favorite, removeEntry, stats } from "../controllers/vaultController.js";
import { auth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

const entryRules = [
  body("encrypted_data").notEmpty().withMessage("Données chiffrées requises"),
  body("iv").notEmpty().withMessage("IV requis"),
];

router.use(auth);

router.get("/",        getEntries);
router.get("/stats",   stats);
router.post("/",       entryRules, validate, addEntry);
router.put("/:id",     entryRules, validate, editEntry);
router.patch("/:id/favorite", favorite);
router.delete("/:id",  removeEntry);

export default router;

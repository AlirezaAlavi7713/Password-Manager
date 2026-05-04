import { Router } from "express";
import { body } from "express-validator";
import { getCategories, addCategory, editCategory, removeCategory } from "../controllers/categoriesController.js";
import { auth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

const categoryRules = [
  body("name").trim().notEmpty().withMessage("Le nom est requis"),
];

router.use(auth);

router.get("/",       getCategories);
router.post("/",      categoryRules, validate, addCategory);
router.put("/:id",    categoryRules, validate, editCategory);
router.delete("/:id", removeCategory);

export default router;

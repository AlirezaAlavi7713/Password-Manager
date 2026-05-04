import express from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { corsOptions } from "./config/cors.js";

import authRoutes       from "./routes/auth.js";
import vaultRoutes      from "./routes/vault.js";
import categoriesRoutes from "./routes/categories.js";

const app = express();

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));

app.use("/api/auth",       authRoutes);
app.use("/api/vault",      vaultRoutes);
app.use("/api/categories", categoriesRoutes);

export default app;

import express, {
  type Express,
  Request,
  Response,
  NextFunction,
} from "express";
import cors from "cors";
import session from "express-session";
import router from "./routes";
import { logger } from "./lib/logger";
import "./session.d";

const app: Express = express();

app.set("trust proxy", 1);

// Custom lightweight logging middleware instead of pino-http type collision issues
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info(
      {
        method: req.method,
        url: req.url?.split("?")[0],
        statusCode: res.statusCode,
        durationMs: duration,
      },
      "HTTP request completed",
    );
  });
  next();
});

app.use(
  session({
    name: "zoning.sid",
    secret: process.env.SESSION_SECRET ?? "dev-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 8 * 60 * 60 * 1000,
    },
  }),
);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;

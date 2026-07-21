import express, { type Express } from "express";
import cors from "cors";
import session from "express-session";
import pinoHttpPkg from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import "./session.d";

// Handle default/namespace import compatibility for pino-http
const pinoHttp =
  (pinoHttpPkg as unknown as { default: typeof pinoHttpPkg }).default ||
  pinoHttpPkg;

const app: Express = express();

app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req: any) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res: any) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

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

import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { verifyPassword, hashPassword, isBcryptHash } from "../lib/password";

const router = Router();

router.post("/auth/login", async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required." });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase().trim()))
    .limit(1);

  const valid = user ? await verifyPassword(password, user.password) : false;

  if (!user || !valid) {
    res.status(401).json({ error: "Invalid email or password." });
    return;
  }

  if (!user.isActive) {
    res.status(403).json({ error: "This account has been deactivated." });
    return;
  }

  // Transparently upgrade legacy plaintext passwords to bcrypt hashes on successful login.
  if (!isBcryptHash(user.password)) {
    const upgraded = await hashPassword(password);
    await db
      .update(usersTable)
      .set({ password: upgraded })
      .where(eq(usersTable.id, user.id));
  }

  const session = req.session as { userId?: number; userRole?: string };
  session.userId = user.id;
  session.userRole = user.role;

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
  });
});

router.get("/auth/me", async (req: Request, res: Response) => {
  const session = req.session as { userId?: number; userRole?: string };
  const userId = session.userId;

  if (!userId) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!user || !user.isActive) {
    req.session.destroy(() => {});
    res.status(401).json({ error: "Session invalid." });
    return;
  }

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
  });
});

router.post("/auth/logout", (req: Request, res: Response) => {
  req.session.destroy(() => {
    res.clearCookie("zoning.sid");
    res.json({ ok: true });
  });
});

export default router;

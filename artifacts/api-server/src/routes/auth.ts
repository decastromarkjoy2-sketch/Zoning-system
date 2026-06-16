import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

router.post("/auth/login", async (req, res) => {
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

  if (!user || user.password !== password) {
    res.status(401).json({ error: "Invalid email or password." });
    return;
  }

  if (!user.isActive) {
    res.status(403).json({ error: "This account has been deactivated." });
    return;
  }

  req.session.userId = user.id;
  req.session.userRole = user.role;

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
  });
});

router.get("/auth/me", async (req, res) => {
  const userId = req.session.userId;

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

router.post("/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("zoning.sid");
    res.json({ ok: true });
  });
});

export default router;

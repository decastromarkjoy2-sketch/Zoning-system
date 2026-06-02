import { Router, type IRouter } from "express";
import { db, usersTable, auditLogsTable } from "@workspace/db";
import { eq, ilike, or, and } from "drizzle-orm";
import {
  CreateUserBody,
  GetUserParams,
  UpdateUserParams,
  UpdateUserBody,
  DeleteUserParams,
  ListUsersQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function userToResponse(u: typeof usersTable.$inferSelect) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    is_active: u.isActive,
    created_at: u.createdAt.toISOString(),
    updated_at: u.updatedAt.toISOString(),
  };
}

router.get("/users", async (req, res): Promise<void> => {
  const params = ListUsersQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  let query = db.select().from(usersTable);
  const conditions = [];
  if (params.data.role) {
    conditions.push(eq(usersTable.role, params.data.role as any));
  }
  if (params.data.search) {
    conditions.push(
      or(
        ilike(usersTable.name, `%${params.data.search}%`),
        ilike(usersTable.email, `%${params.data.search}%`)
      )
    );
  }
  const rows = conditions.length
    ? await db.select().from(usersTable).where(and(...conditions))
    : await db.select().from(usersTable);

  res.json(rows.map(userToResponse));
});

router.post("/users", async (req, res): Promise<void> => {
  const parsed = CreateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [user] = await db
    .insert(usersTable)
    .values({
      name: parsed.data.name,
      email: parsed.data.email,
      role: parsed.data.role as any,
      password: parsed.data.password,
    })
    .returning();

  await db.insert(auditLogsTable).values({
    action: "create",
    entityType: "user",
    entityId: user.id,
    changes: { name: user.name, email: user.email, role: user.role },
    ipAddress: req.ip,
  });

  res.status(201).json(userToResponse(user));
});

router.get("/users/:id", async (req, res): Promise<void> => {
  const params = GetUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, params.data.id));

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(userToResponse(user));
});

router.patch("/users/:id", async (req, res): Promise<void> => {
  const params = UpdateUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Partial<typeof usersTable.$inferInsert> = {};
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.email !== undefined) updateData.email = parsed.data.email;
  if (parsed.data.role !== undefined) updateData.role = parsed.data.role as any;
  if (parsed.data.is_active !== undefined) updateData.isActive = parsed.data.is_active;
  if (parsed.data.password != null) updateData.password = parsed.data.password;

  const [user] = await db
    .update(usersTable)
    .set(updateData)
    .where(eq(usersTable.id, params.data.id))
    .returning();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  await db.insert(auditLogsTable).values({
    action: "update",
    entityType: "user",
    entityId: user.id,
    changes: parsed.data,
    ipAddress: req.ip,
  });

  res.json(userToResponse(user));
});

router.delete("/users/:id", async (req, res): Promise<void> => {
  const params = DeleteUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [user] = await db
    .delete(usersTable)
    .where(eq(usersTable.id, params.data.id))
    .returning();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  await db.insert(auditLogsTable).values({
    action: "delete",
    entityType: "user",
    entityId: params.data.id,
    ipAddress: req.ip,
  });

  res.sendStatus(204);
});

export default router;

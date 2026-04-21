import { Router, type IRouter } from "express";
import { db, servicesTable, checklistItemsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/services", async (_req, res): Promise<void> => {
  const all = await db.select().from(servicesTable);
  res.json(all);
});

router.get("/services/:serviceId/checklist", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.serviceId), 10);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid serviceId" });
    return;
  }
  const items = await db.select().from(checklistItemsTable).where(eq(checklistItemsTable.serviceId, id));
  res.json(items.map((i) => ({ key: i.itemKey, label: i.label, required: i.required === 1, hint: i.hint })));
});

export default router;

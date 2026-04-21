import { Router, type IRouter } from "express";
import { db, branchesTable } from "@workspace/db";
import { computeBranchPulse } from "../lib/queue";

const router: IRouter = Router();

router.get("/branches", async (_req, res): Promise<void> => {
  const all = await db.select().from(branchesTable);
  const pulses = await Promise.all(all.map((b) => computeBranchPulse(b.id)));
  res.json(pulses.filter((p): p is NonNullable<typeof p> => p !== null));
});

router.get("/branches/:branchId", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.branchId), 10);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid branchId" });
    return;
  }
  const pulse = await computeBranchPulse(id);
  if (!pulse) {
    res.status(404).json({ error: "Branch not found" });
    return;
  }
  res.json(pulse);
});

export default router;

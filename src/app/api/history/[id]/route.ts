import { handlers } from "@/lib/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return handlers.historyGet(req, id);
}

export async function DELETE(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return handlers.historyDelete(req, id);
}

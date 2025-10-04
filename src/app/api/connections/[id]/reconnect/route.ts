export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  void ctx; // noop
  return Response.json({ ok: true });
}
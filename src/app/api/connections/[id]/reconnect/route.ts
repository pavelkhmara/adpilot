export async function POST_reconnect(req: Request, ctx: { params: Promise<{ id: string }> }) {
  void ctx; // noop
  return Response.json({ ok: true });
}
export { POST_reconnect as POST };
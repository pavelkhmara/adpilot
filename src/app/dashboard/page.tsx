import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ClientDashboard from "./ClientDashboard";

export default async function Page() {
  const clientId = (await cookies()).get("clientId")?.value || null;
  if (!clientId) redirect("/"); // нет логина → на страницу входа

  return <ClientDashboard clientId={clientId} />;
}

import { AppShell } from "@/components/app-shell";
import { ClientsManager } from "@/components/clients-manager";
import { requireAdminPage } from "@/lib/auth/auth";
import { getClientsForManagement } from "@/lib/data";

export default async function ClientsPage() {
  await requireAdminPage();
  const clients = await getClientsForManagement();

  return (
    <AppShell
      title="Clientes"
      description="Cadastre e organize as contas que vao alimentar as analises semanais de conteudo."
    >
      <ClientsManager clients={clients} />
    </AppShell>
  );
}

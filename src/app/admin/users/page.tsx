import { AppShell } from "@/components/app-shell";
import { UsersManager } from "@/components/users-manager";
import { requireAdminPage } from "@/lib/auth/auth";
import { getClientsForManagement, getUsersForAdmin } from "@/lib/data";

export default async function AdminUsersPage() {
  await requireAdminPage();

  const [users, clients] = await Promise.all([getUsersForAdmin(), getClientsForManagement()]);

  return (
    <AppShell
      title="Usuários"
      description="Gerencie acessos, perfis e vínculo de clientes para o time interno."
    >
      <UsersManager
        users={users.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          userClients: user.userClients,
        }))}
        clients={clients.map((client) => ({
          id: client.id,
          name: client.name,
        }))}
      />
    </AppShell>
  );
}

import { getAccountInfo, getWorkspaceInfo } from "@/services/settings";
import { AccountForm } from "@/components/settings/account-form";
import { PasswordForm } from "@/components/settings/password-form";
import { WorkspaceForm } from "@/components/settings/workspace-form";

export default async function AccountSettingsPage() {
  const [account, workspace] = await Promise.all([
    getAccountInfo(),
    getWorkspaceInfo(),
  ]);

  return (
    <div className="space-y-6">
      {account && <AccountForm user={account} />}
      <PasswordForm />
      {workspace && <WorkspaceForm workspace={workspace} />}
    </div>
  );
}

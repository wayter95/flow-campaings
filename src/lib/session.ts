import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function getSession() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return session;
}

export async function getWorkspaceId() {
  const session = await getSession();
  return (session.user as Record<string, unknown>).workspaceId as string;
}

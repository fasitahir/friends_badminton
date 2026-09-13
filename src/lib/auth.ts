import { cookies } from "next/headers";
import { Admin } from "./supabase/types";

export async function getAdmin(): Promise<Pick<Admin, "id" | "username" | "role"> | null> {
  const cookieStore = await cookies();
  const authVal = cookieStore.get("admin_auth")?.value;
  
  if (!authVal) return null;
  
  try {
    return JSON.parse(authVal);
  } catch (e) {
    if (authVal === "true") {
      return { id: "legacy-admin", username: "admin", role: "admin" };
    }
    return null;
  }
}

export async function getIsAdmin() {
  const admin = await getAdmin();
  return !!admin;
}

export async function getIsSuperAdmin() {
  const admin = await getAdmin();
  return admin?.role === "superadmin";
}

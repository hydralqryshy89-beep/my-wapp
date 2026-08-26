import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/permissions";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "تسجيل الدخول — Marketing Plan",
};

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return <LoginForm />;
}

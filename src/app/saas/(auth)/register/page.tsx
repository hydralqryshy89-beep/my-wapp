import Link from "next/link";
import { Boxes } from "lucide-react";
import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white">
          <Boxes size={22} />
        </div>
        <div>
          <div className="text-lg font-bold text-slate-900">SaaS Builder</div>
          <div className="text-sm text-slate-500">Create your account</div>
        </div>
      </div>

      <RegisterForm />

      <p className="mt-4 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link href="/saas/login" className="font-semibold text-indigo-600 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

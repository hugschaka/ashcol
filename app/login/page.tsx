import Link from "next/link";
import { GlobalLoginForm } from "./login-form";

export default function GlobalLoginPage() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-1">
          <Link href="/" className="text-3xl font-bold text-accent">
            אשכול
          </Link>
          <p className="text-neutral-500">התחברות</p>
        </div>
        <GlobalLoginForm />
        <p className="text-center text-sm text-neutral-400">
          אין לכם חשבון? פנו למנהל הארגון שלכם.
        </p>
      </div>
    </main>
  );
}

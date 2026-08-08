import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { SiteHeader } from "@/components/site-header";
import { getSession } from "@/lib/session";

export default async function SignupPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-5xl flex-1 items-center px-6 pb-16">
        <AuthForm mode="signup" />
      </main>
    </>
  );
}

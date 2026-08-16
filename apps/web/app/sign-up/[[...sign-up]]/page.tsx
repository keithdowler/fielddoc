import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="authShell">
      <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
    </main>
  );
}

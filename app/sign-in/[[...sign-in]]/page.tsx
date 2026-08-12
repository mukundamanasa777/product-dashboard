import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <SignIn withSignUp={false} forceRedirectUrl="/dashboard/products" signUpUrl="/sign-up"
      appearance={{
        elements: {
        footerAction: {
          display: "none",
        },
    },
  }}/>
    </div>
  );
}

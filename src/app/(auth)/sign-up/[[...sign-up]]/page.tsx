import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div>
      <h2 className="mb-2 text-3xl font-extrabold text-gray-900">
        Get Started
      </h2>
      <p className="mb-8 text-base text-muted">
        Create your account to access your client portal — fast, easy, and no
        credit card required.
      </p>

      <SignUp
        appearance={{
          elements: {
            rootBox: "w-full",
            card: "shadow-none border-0 p-0 bg-transparent w-full",
            headerTitle: "hidden",
            headerSubtitle: "hidden",
            logoBox: "hidden",
            formFieldLabel: "text-sm font-medium text-gray-700",
            formFieldInput:
              "w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-[15px] text-gray-900 focus:border-pb-navy focus:ring-2 focus:ring-pb-navy/20 focus:outline-none",
            formButtonPrimary:
              "w-full bg-pb-navy hover:bg-pb-navy/90 text-white font-semibold py-3 rounded-lg transition-colors text-[15px] shadow-sm",
            footerActionLink: "text-pb-navy hover:text-pb-plum font-semibold",
            socialButtonsBlockButton:
              "border border-gray-300 hover:bg-gray-50 rounded-lg py-2.5 text-gray-700 font-medium",
            socialButtonsBlockButtonText: "font-medium",
            dividerLine: "bg-gray-200",
            dividerText: "text-gray-400 text-xs",
            formFieldHintText: "text-xs text-muted",
            identityPreviewText: "text-gray-700",
            identityPreviewEditButton: "text-pb-navy",
          },
          layout: {
            socialButtonsPlacement: "bottom",
          },
        }}
      />
    </div>
  );
}

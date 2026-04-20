import Link from "next/link";

const features = [
  "Real-time task tracking and updates",
  "Secure file sharing and document management",
  "Direct messaging and team collaboration",
  "Project timelines and milestone visibility",
];

function CheckIcon() {
  return (
    <svg
      className="h-3 w-3 text-white"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={3}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full">
      {/* Hero panel (hidden on mobile) */}
      <aside className="pb-auth-hero hidden flex-1 items-center justify-center p-12 lg:flex">
        <div className="max-w-[480px]">
          <div
            className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl font-extrabold text-white"
            style={{
              background:
                "linear-gradient(135deg, var(--pb-red), var(--pb-plum))",
              boxShadow: "0 8px 32px rgba(2, 29, 64, 0.4)",
            }}
          >
            P
          </div>
          <h1 className="mb-4 text-4xl font-extrabold leading-tight text-white lg:text-5xl">
            PressBook 360 Client Portal
          </h1>
          <p className="mb-10 text-lg leading-relaxed text-blue-100">
            Your centralized hub for project management, file sharing, and
            seamless collaboration with our team.
          </p>
          <ul className="space-y-4">
            {features.map((feature) => (
              <li
                key={feature}
                className="flex items-center gap-3 text-blue-50"
              >
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                  style={{ background: "rgba(255, 255, 255, 0.15)" }}
                >
                  <CheckIcon />
                </span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* Form panel */}
      <main className="flex flex-1 items-center justify-center bg-background p-6 sm:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <Link
            href="/"
            className="mb-8 flex items-center gap-2 lg:hidden"
          >
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-extrabold text-white"
              style={{
                background:
                  "linear-gradient(135deg, var(--pb-red), var(--pb-plum))",
              }}
            >
              P
            </div>
            <span className="text-lg font-bold text-gray-900">
              PressBook 360
            </span>
          </Link>

          {children}

          <p className="mt-12 text-center text-xs text-muted">
            &copy; PressBook 360, {new Date().getFullYear()}. All rights
            reserved.
          </p>
        </div>
      </main>
    </div>
  );
}

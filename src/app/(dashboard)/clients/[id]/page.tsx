import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, Circle } from "lucide-react";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { getActiveOrg } from "@/lib/auth/active-org";
import { EditClientForm } from "./edit-client-form";

export const dynamic = "force-dynamic";

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [client] = await db
    .select()
    .from(contacts)
    .where(eq(contacts.id, id))
    .limit(1);

  if (!client) {
    notFound();
  }

  // If the client belongs to a different organization than the one the staff
  // user currently has selected, bounce them back to the Clients list for
  // the active org instead of showing a hard 404. This happens naturally
  // whenever someone switches companies while viewing a specific client.
  const activeOrg = await getActiveOrg();
  if (activeOrg && client.orgId !== activeOrg.id) {
    redirect("/clients");
  }

  const fullName =
    [client.firstName, client.lastName].filter(Boolean).join(" ") ||
    "(no name)";
  const activated = Boolean(client.clerkId);

  return (
    <div className="max-w-3xl space-y-6">
      <Link
        href="/clients"
        className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to clients
      </Link>

      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-text">{fullName}</h1>
          {activated ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-pb-green">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Portal active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-muted">
              <Circle className="h-3.5 w-3.5" />
              Portal pending
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[13px] text-text-2">
          Edit this client&rsquo;s info below.
        </p>
      </div>

      <EditClientForm
        client={{
          id: client.id,
          avatarUrl: client.avatarUrl,
          firstName: client.firstName,
          lastName: client.lastName,
          email: client.email,
          portalEmail: client.portalEmail,
          phone: client.phone,
          officePhone: client.officePhone,
          company: client.company,
          title: client.title,
          website: client.website,
          industry: client.industry,
          status: client.status,
          licenseNumber: client.licenseNumber,
          address: client.address,
          address2: client.address2,
          city: client.city,
          state: client.state,
          zip: client.zip,
          notes: client.notes,
          additionalContacts: client.additionalContacts,
        }}
      />
    </div>
  );
}

"use client";

import { useState } from "react";
import { Plus, Settings2, Trash2, X } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/button";
import {
  addCategory,
  addLocation,
  addOrganizer,
  deleteCategory,
  deleteLocation,
  deleteOrganizer,
} from "./actions";

type Tab = "categories" | "organizers" | "locations";

type Category = {
  id: string;
  name: string;
  parentId: string | null;
  isParent: boolean;
};
type Organizer = { id: string; name: string };
type Location = {
  id: string;
  venueName: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
};

export function ManageSettingsButton({
  categories,
  organizers,
  locations,
}: {
  categories: Category[];
  organizers: Organizer[];
  locations: Location[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        variant="secondary"
        size="md"
        leftIcon={<Settings2 className="h-3.5 w-3.5" />}
      >
        Manage
      </Button>
      {open && (
        <ManageSettingsModal
          categories={categories}
          organizers={organizers}
          locations={locations}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function ManageSettingsModal({
  categories,
  organizers,
  locations,
  onClose,
}: {
  categories: Category[];
  organizers: Organizer[];
  locations: Location[];
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("categories");

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8">
      <div className="w-full max-w-2xl rounded-[var(--rlg)] bg-card shadow-[var(--sh-lg)]">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2.5">
            <Settings2 className="h-4 w-4 text-pb-navy" />
            <h2 className="text-base font-semibold text-text">
              Manage Event Settings
            </h2>
          </div>
          <Button
            type="button"
            onClick={onClose}
            aria-label="Close"
            variant="ghost"
            size="icon"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-0 border-b border-border px-6">
          {(["categories", "organizers", "locations"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`relative px-3 py-3 text-[13px] font-medium capitalize transition-colors ${
                tab === t
                  ? "text-text"
                  : "text-text-2 hover:text-text"
              }`}
            >
              {t}
              {tab === t && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-pb-navy" />
              )}
            </button>
          ))}
        </div>

        <div className="px-6 py-5">
          {tab === "categories" && (
            <CategoriesTab categories={categories} />
          )}
          {tab === "organizers" && (
            <OrganizersTab organizers={organizers} />
          )}
          {tab === "locations" && <LocationsTab locations={locations} />}
        </div>

        <div className="flex justify-end border-t border-border px-6 py-4">
          <Button
            type="button"
            onClick={onClose}
            variant="secondary"
            size="md"
          >
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────

function CategoriesTab({ categories }: { categories: Category[] }) {
  const parents = categories.filter((c) => c.isParent);
  const children = categories.filter((c) => !c.isParent);

  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-2">
          Parent Categories
        </h3>
        {parents.length > 0 && (
          <ul className="mb-3 divide-y divide-border rounded-[var(--r)] border border-border">
            {parents.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between px-3 py-2 text-[13px]"
              >
                <span className="text-text">{p.name}</span>
                <form action={deleteCategory}>
                  <input type="hidden" name="id" value={p.id} />
                  <Button
                    type="submit"
                    aria-label="Delete"
                    variant="ghost"
                    size="icon"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <form action={addCategory} className="flex items-center gap-2">
          <input
            name="name"
            type="text"
            required
            placeholder="New parent category name…"
            className="flex-1 rounded-[var(--r)] border border-border bg-card px-3 py-2 text-[13px] text-text focus:border-pb-navy focus:outline-none focus:ring-2 focus:ring-[rgba(2,29,64,0.15)]"
          />
          <input type="hidden" name="isParent" value="on" />
          <Button
            type="submit"
            variant="primary"
            size="sm"
            leftIcon={<Plus className="h-3.5 w-3.5" />}
          >
            Add
          </Button>
        </form>
      </section>

      <section>
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-2">
          Categories
        </h3>
        {children.length === 0 ? (
          <p className="mb-3 rounded-[var(--r)] border border-dashed border-border px-3 py-4 text-center text-[12.5px] text-text-2">
            No custom categories yet.
          </p>
        ) : (
          <table className="mb-3 w-full text-[13px]">
            <thead>
              <tr className="border-b border-border text-[10px] uppercase tracking-wider text-text-2">
                <th className="py-2 text-left font-semibold">Category</th>
                <th className="py-2 text-left font-semibold">Parent Category</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {children.map((c) => {
                const parent = parents.find((p) => p.id === c.parentId);
                return (
                  <tr key={c.id}>
                    <td className="py-2 text-text">{c.name}</td>
                    <td className="py-2 text-text-2">
                      {parent?.name ?? "—"}
                    </td>
                    <td className="py-2 text-right">
                      <form action={deleteCategory}>
                        <input type="hidden" name="id" value={c.id} />
                        <Button
                          type="submit"
                          aria-label="Delete"
                          variant="ghost"
                          size="icon"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <form
          action={addCategory}
          className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr,1fr,auto]"
        >
          <input
            name="name"
            type="text"
            required
            placeholder="Category name…"
            className="rounded-[var(--r)] border border-border bg-card px-3 py-2 text-[13px] text-text focus:border-pb-navy focus:outline-none focus:ring-2 focus:ring-[rgba(2,29,64,0.15)]"
          />
          <select
            name="parentId"
            defaultValue=""
            className="rounded-[var(--r)] border border-border bg-card px-3 py-2 text-[13px] text-text focus:border-pb-navy focus:outline-none focus:ring-2 focus:ring-[rgba(2,29,64,0.15)]"
          >
            <option value="">No parent</option>
            {parents.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            leftIcon={<Plus className="h-3.5 w-3.5" />}
          >
            Add
          </Button>
        </form>
      </section>
    </div>
  );
}

function OrganizersTab({ organizers }: { organizers: Organizer[] }) {
  return (
    <div className="space-y-4">
      <h3 className="text-[10px] font-semibold uppercase tracking-wider text-text-2">
        Organizers
      </h3>
      {organizers.length === 0 ? (
        <p className="rounded-[var(--r)] border border-dashed border-border px-3 py-4 text-center text-[12.5px] text-text-2">
          No organizers yet.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-[var(--r)] border border-border">
          {organizers.map((o) => (
            <li
              key={o.id}
              className="flex items-center justify-between px-3 py-2 text-[13px]"
            >
              <span className="text-text">{o.name}</span>
              <form action={deleteOrganizer}>
                <input type="hidden" name="id" value={o.id} />
                <Button
                  type="submit"
                  aria-label="Delete"
                  variant="ghost"
                  size="icon"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}
      <form action={addOrganizer} className="flex items-center gap-2">
        <input
          name="name"
          type="text"
          required
          placeholder="New organizer name…"
          className="flex-1 rounded-[var(--r)] border border-border bg-card px-3 py-2 text-[13px] text-text focus:border-pb-navy focus:outline-none focus:ring-2 focus:ring-[rgba(2,29,64,0.15)]"
        />
        <Button
          type="submit"
          variant="primary"
          size="sm"
          leftIcon={<Plus className="h-3.5 w-3.5" />}
        >
          Add
        </Button>
      </form>
    </div>
  );
}

function LocationsTab({ locations }: { locations: Location[] }) {
  return (
    <div className="space-y-4">
      <h3 className="text-[10px] font-semibold uppercase tracking-wider text-text-2">
        Saved Locations
      </h3>
      {locations.length === 0 ? (
        <p className="rounded-[var(--r)] border border-dashed border-border px-3 py-4 text-center text-[12.5px] text-text-2">
          No saved locations yet.
        </p>
      ) : (
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border text-[10px] uppercase tracking-wider text-text-2">
              <th className="py-2 text-left font-semibold">Venue Name</th>
              <th className="py-2 text-left font-semibold">Address</th>
              <th className="py-2 text-left font-semibold">City</th>
              <th className="py-2 text-left font-semibold">State</th>
              <th className="py-2 text-left font-semibold">ZIP</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {locations.map((l) => (
              <tr key={l.id}>
                <td className="py-2 text-text">{l.venueName}</td>
                <td className="py-2 text-text-2">{l.address ?? "—"}</td>
                <td className="py-2 text-text-2">{l.city ?? "—"}</td>
                <td className="py-2 text-text-2">{l.state ?? "—"}</td>
                <td className="py-2 text-text-2">{l.zip ?? "—"}</td>
                <td className="py-2 text-right">
                  <form action={deleteLocation}>
                    <input type="hidden" name="id" value={l.id} />
                    <Button
                      type="submit"
                      aria-label="Delete"
                      variant="ghost"
                      size="icon"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <form
        action={addLocation}
        className="grid grid-cols-1 gap-2 sm:grid-cols-[1.4fr,2fr,1fr,0.7fr,0.7fr,auto]"
      >
        <input
          name="venueName"
          type="text"
          required
          placeholder="Venue name…"
          className="rounded-[var(--r)] border border-border bg-card px-3 py-2 text-[13px] text-text focus:border-pb-navy focus:outline-none focus:ring-2 focus:ring-[rgba(2,29,64,0.15)]"
        />
        <input
          name="address"
          type="text"
          placeholder="Street address…"
          className="rounded-[var(--r)] border border-border bg-card px-3 py-2 text-[13px] text-text focus:border-pb-navy focus:outline-none focus:ring-2 focus:ring-[rgba(2,29,64,0.15)]"
        />
        <input
          name="city"
          type="text"
          placeholder="City"
          className="rounded-[var(--r)] border border-border bg-card px-3 py-2 text-[13px] text-text focus:border-pb-navy focus:outline-none focus:ring-2 focus:ring-[rgba(2,29,64,0.15)]"
        />
        <input
          name="state"
          type="text"
          placeholder="State"
          className="rounded-[var(--r)] border border-border bg-card px-3 py-2 text-[13px] text-text focus:border-pb-navy focus:outline-none focus:ring-2 focus:ring-[rgba(2,29,64,0.15)]"
        />
        <input
          name="zip"
          type="text"
          placeholder="ZIP"
          className="rounded-[var(--r)] border border-border bg-card px-3 py-2 text-[13px] text-text focus:border-pb-navy focus:outline-none focus:ring-2 focus:ring-[rgba(2,29,64,0.15)]"
        />
        <Button
          type="submit"
          variant="primary"
          size="sm"
          leftIcon={<Plus className="h-3.5 w-3.5" />}
        >
          Add
        </Button>
      </form>
    </div>
  );
}

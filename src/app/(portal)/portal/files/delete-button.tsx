"use client";

import { useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { deletePortalFile } from "./actions";

export function DeletePortalFileButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (!confirm("Delete this file?")) return;
    startTransition(async () => {
      await deletePortalFile(id);
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-label="Delete"
      className="flex h-7 w-7 items-center justify-center rounded-lg text-muted transition-colors hover:bg-[rgba(219,25,36,0.08)] hover:text-pb-red disabled:cursor-wait"
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Trash2 className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

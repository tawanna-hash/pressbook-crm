"use client";

import { useRef } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deletePoll } from "./actions";

export function DeletePollButton({
  pollId,
  pollName,
}: {
  pollId: string;
  pollName: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  function handleClick() {
    const ok = window.confirm(
      `Delete "${pollName}"? This removes the poll and all votes. This can't be undone.`,
    );
    if (ok) formRef.current?.requestSubmit();
  }

  return (
    <form ref={formRef} action={deletePoll}>
      <input type="hidden" name="id" value={pollId} />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`Delete ${pollName}`}
        title="Delete poll"
        onClick={handleClick}
        className="hover:bg-[rgba(219,25,36,0.08)] hover:text-pb-red"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </form>
  );
}

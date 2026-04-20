"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CopyLinkButton({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/p/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard denied — no-op */
    }
  }

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={handleCopy}
      aria-label="Copy poll link"
      leftIcon={
        copied ? (
          <Check className="h-3.5 w-3.5 text-[rgb(34,139,99)]" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )
      }
    >
      {copied ? "Copied" : "Copy Link"}
    </Button>
  );
}

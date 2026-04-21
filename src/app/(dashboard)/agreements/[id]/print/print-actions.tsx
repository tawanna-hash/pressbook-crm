"use client";

import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function PrintActions() {
  return (
    <div className="flex items-center gap-2">
      <Link href="/agreements" className="inline-flex">
        <Button variant="secondary" size="sm" leftIcon={<ArrowLeft className="h-3 w-3" />}>
          Back
        </Button>
      </Link>
      <Button
        type="button"
        variant="primary"
        size="sm"
        onClick={() => window.print()}
        leftIcon={<Printer className="h-3 w-3" />}
      >
        Print
      </Button>
    </div>
  );
}

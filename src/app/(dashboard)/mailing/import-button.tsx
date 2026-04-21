"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImportDialog } from "./import-dialog";
import type { MailingSegment } from "./mailing-options";

export function ImportButton({ segment }: { segment: MailingSegment }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="md"
        onClick={() => setOpen(true)}
        leftIcon={<Upload className="h-3.5 w-3.5" />}
      >
        Import
      </Button>
      <ImportDialog
        segment={segment}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

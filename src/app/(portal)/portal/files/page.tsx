import { FolderOpen } from "lucide-react";
import { Placeholder } from "@/components/shared/placeholder";

export default function PortalFilesPage() {
  return (
    <Placeholder
      title="Files"
      description="Documents and assets shared with your team."
      icon={FolderOpen}
    />
  );
}

import { MessageSquare } from "lucide-react";
import { Placeholder } from "@/components/shared/placeholder";

export default function PortalMessagesPage() {
  return (
    <Placeholder
      title="Messages"
      description="Direct chat with your account team."
      icon={MessageSquare}
    />
  );
}

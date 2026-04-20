import { ListTodo } from "lucide-react";
import { Placeholder } from "@/components/shared/placeholder";

export default function PortalTasksPage() {
  return (
    <Placeholder
      title="Tasks"
      description="Action items and to-dos from our team."
      icon={ListTodo}
    />
  );
}

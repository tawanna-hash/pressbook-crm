import { Clock } from "lucide-react";
import { Placeholder } from "@/components/shared/placeholder";

export default function BookingSchedulingPage() {
  return (
    <Placeholder
      title="Scheduling"
      description="Configure your availability, event types, buffer times, and booking windows."
      icon={Clock}
    />
  );
}

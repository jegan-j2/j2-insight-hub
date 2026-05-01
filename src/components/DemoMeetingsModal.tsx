import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { DateRange } from "react-day-picker";

interface DemoMeetingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sdrName: string;
  clientId: string;
  dateRange?: DateRange;
}

export const DemoMeetingsModal = ({ isOpen, onClose, sdrName }: DemoMeetingsModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Demo Meetings — {sdrName}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">No demo meetings to display.</p>
      </DialogContent>
    </Dialog>
  );
};

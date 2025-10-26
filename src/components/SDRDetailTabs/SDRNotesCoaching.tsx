import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { FileText, CheckSquare } from "lucide-react";

interface SDRNotesCoachingProps {
  sdrName: string;
}

const mockNotes = [
  {
    date: "Oct 15, 2025",
    note: "Great improvement in answer rate. Keep it up! Focus on maintaining consistency.",
    author: "Manager",
  },
  {
    date: "Oct 8, 2025",
    note: "Focus on DM messaging quality. Review successful templates and personalize outreach.",
    author: "Manager",
  },
  {
    date: "Oct 1, 2025",
    note: "Excellent work on the Inxpress campaign. SQL conversion is above target.",
    author: "Manager",
  },
];

export const SDRNotesCoaching = ({ sdrName }: SDRNotesCoachingProps) => {
  return (
    <>
      {/* Add New Notes */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle>Manager Notes</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="manager-notes" className="text-sm font-medium mb-2 block">
              Add coaching notes, feedback, or action items
            </Label>
            <Textarea
              id="manager-notes"
              placeholder="Add coaching notes, feedback, or action items..."
              rows={5}
              className="resize-none"
            />
          </div>
          <div className="flex justify-end">
            <Button disabled className="opacity-50 cursor-not-allowed">
              Save Notes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Previous Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Previous Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockNotes.map((note, index) => (
              <div
                key={index}
                className="p-4 rounded-lg bg-muted/30 border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">{note.date}</span>
                  <span className="text-xs text-muted-foreground">{note.author}</span>
                </div>
                <p className="text-sm text-muted-foreground">{note.note}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Action Items Checklist */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-primary" />
            <CardTitle>Action Items & Development Goals</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/30 transition-colors">
              <Checkbox id="action1" className="mt-1" />
              <div className="flex-1">
                <Label
                  htmlFor="action1"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Review call scripts for improved objection handling
                </Label>
                <p className="text-xs text-muted-foreground mt-1">Due: Oct 25, 2025</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/30 transition-colors">
              <Checkbox id="action2" className="mt-1" />
              <div className="flex-1">
                <Label
                  htmlFor="action2"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Practice objection handling scenarios
                </Label>
                <p className="text-xs text-muted-foreground mt-1">Due: Oct 28, 2025</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <Checkbox id="action3" checked className="mt-1" />
              <div className="flex-1">
                <Label
                  htmlFor="action3"
                  className="text-sm font-medium leading-none text-green-700 dark:text-green-400 cursor-pointer line-through"
                >
                  Shadow top performer for best practices
                </Label>
                <p className="text-xs text-green-600 dark:text-green-500 mt-1">Completed: Oct 16, 2025</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/30 transition-colors">
              <Checkbox id="action4" className="mt-1" />
              <div className="flex-1">
                <Label
                  htmlFor="action4"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Complete DM personalization training module
                </Label>
                <p className="text-xs text-muted-foreground mt-1">Due: Nov 1, 2025</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/30 transition-colors">
              <Checkbox id="action5" className="mt-1" />
              <div className="flex-1">
                <Label
                  htmlFor="action5"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Schedule 1-on-1 coaching session with sales director
                </Label>
                <p className="text-xs text-muted-foreground mt-1">Due: Oct 30, 2025</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
};

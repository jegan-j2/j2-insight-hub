import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { FileText, CheckSquare, Plus, AlertCircle, Loader2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { format, isPast, parseISO } from "date-fns";

interface SDRNotesCoachingProps {
  sdrName: string;
  isSdrView?: boolean; // true when SDR viewing their own profile
}

interface CoachingNote {
  id: string;
  sdr_name: string;
  author_name: string;
  author_role: string;
  content: string;
  created_at: string;
}

interface ActionItem {
  id: string;
  sdr_name: string;
  title: string;
  due_date: string | null;
  status: string;
  completed_date: string | null;
  created_by: string;
  created_at: string;
}

const MAX_NOTE_LENGTH = 500;

export const SDRNotesCoaching = ({ sdrName, isSdrView = false }: SDRNotesCoachingProps) => {
  const [notes, setNotes] = useState<CoachingNote[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [noteContent, setNoteContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemDueDate, setNewItemDueDate] = useState("");
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const promises: Promise<any>[] = [
      supabase
        .from("sdr_action_items")
        .select("*")
        .eq("sdr_name", sdrName)
        .order("created_at", { ascending: false }),
    ];

    if (!isSdrView) {
      promises.push(
        supabase
          .from("sdr_coaching_notes")
          .select("*")
          .eq("sdr_name", sdrName)
          .order("created_at", { ascending: false })
      );
    }

    const results = await Promise.all(promises);
    setActionItems(results[0].data || []);
    if (!isSdrView && results[1]) {
      setNotes(results[1].data || []);
    }
    setLoading(false);
  }, [sdrName, isSdrView]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Save a new coaching note
  const handleSaveNote = async () => {
    if (!noteContent.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: userRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    const newNote: CoachingNote = {
      id: crypto.randomUUID(),
      sdr_name: sdrName,
      author_name: user.email || "Unknown",
      author_role: userRole?.role || "admin",
      content: noteContent.trim(),
      created_at: new Date().toISOString(),
    };

    // Optimistic update
    setNotes((prev) => [newNote, ...prev]);
    const prevContent = noteContent;
    setNoteContent("");
    setIsSaving(true);

    toast({
      title: "Note saved",
      className: "border-[#10b981]",
      duration: 3000,
    });

    const { error } = await supabase.from("sdr_coaching_notes").insert({
      sdr_name: sdrName,
      author_id: user.id,
      author_name: newNote.author_name,
      author_role: newNote.author_role,
      content: newNote.content,
    });

    if (error) {
      // Revert
      setNotes((prev) => prev.filter((n) => n.id !== newNote.id));
      setNoteContent(prevContent);
      toast({
        title: "Failed to save note",
        description: error.message,
        variant: "destructive",
        duration: 3000,
      });
    }

    setIsSaving(false);
  };

  // Add new action item
  const handleAddActionItem = async () => {
    if (!newItemTitle.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const newItem: ActionItem = {
      id: crypto.randomUUID(),
      sdr_name: sdrName,
      title: newItemTitle.trim(),
      due_date: newItemDueDate || null,
      status: "open",
      completed_date: null,
      created_by: user.email || "Unknown",
      created_at: new Date().toISOString(),
    };

    // Optimistic
    setActionItems((prev) => [newItem, ...prev]);
    setNewItemTitle("");
    setNewItemDueDate("");
    setIsAddingItem(false);

    toast({ title: "Action item added", className: "border-[#10b981]", duration: 3000 });

    const { error } = await supabase.from("sdr_action_items").insert({
      sdr_name: sdrName,
      title: newItem.title,
      due_date: newItem.due_date,
      created_by: newItem.created_by,
    });

    if (error) {
      setActionItems((prev) => prev.filter((i) => i.id !== newItem.id));
      toast({ title: "Failed to add action item", description: error.message, variant: "destructive" });
    }
  };

  // Toggle action item completion
  const handleToggleItem = async (item: ActionItem) => {
    const newStatus = item.status === "open" ? "completed" : "open";
    const completedDate = newStatus === "completed" ? new Date().toISOString() : null;

    // Optimistic
    setActionItems((prev) =>
      prev.map((i) =>
        i.id === item.id ? { ...i, status: newStatus, completed_date: completedDate } : i
      )
    );

    const { error } = await supabase
      .from("sdr_action_items")
      .update({ status: newStatus, completed_date: completedDate })
      .eq("id", item.id);

    if (error) {
      // Revert
      setActionItems((prev) =>
        prev.map((i) => (i.id === item.id ? item : i))
      );
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: newStatus === "completed" ? "Action item completed!" : "Action item reopened",
        className: "border-[#10b981]",
        duration: 3000,
      });
    }
  };

  if (loading) {
    return <div className="text-center text-sm text-muted-foreground py-8">Loading…</div>;
  }

  const isOverdue = (item: ActionItem) =>
    item.status === "open" && item.due_date && isPast(parseISO(item.due_date));

  return (
    <>
      {/* Manager Notes Section — hidden for SDR view */}
      {!isSdrView && (
        <>
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
                  rows={4}
                  className="resize-none"
                  value={noteContent}
                  onChange={(e) => {
                    if (e.target.value.length <= MAX_NOTE_LENGTH) {
                      setNoteContent(e.target.value);
                    }
                  }}
                  maxLength={MAX_NOTE_LENGTH}
                />
                <p className="text-xs text-muted-foreground mt-1 text-right">
                  {noteContent.length} / {MAX_NOTE_LENGTH} characters
                </p>
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={handleSaveNote}
                  disabled={!noteContent.trim() || isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    "Save Notes"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Previous Notes */}
          {notes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Previous Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {notes.map((note) => (
                    <div
                      key={note.id}
                      className="p-4 rounded-lg bg-muted/30 border border-border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-sm font-medium text-foreground">
                          {format(new Date(note.created_at), "MMM dd, yyyy h:mm a")}
                        </span>
                        <span className="text-xs text-muted-foreground capitalize">
                          {note.author_name} ({note.author_role})
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{note.content}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Separator className="my-2" />
        </>
      )}

      {/* Action Items Section — visible to all allowed roles */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-primary" />
              <CardTitle>Action Items & Development Goals</CardTitle>
            </div>
            {!isSdrView && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddingItem(!isAddingItem)}
                className="gap-1"
              >
                <Plus className="h-4 w-4" />
                Add Item
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Add new item form */}
          {isAddingItem && !isSdrView && (
            <div className="p-4 mb-4 rounded-lg border border-border bg-muted/20 space-y-3">
              <Input
                placeholder="Action item title…"
                value={newItemTitle}
                onChange={(e) => setNewItemTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && newItemTitle.trim()) handleAddActionItem(); }}
              />
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-muted-foreground whitespace-nowrap">Due date:</Label>
                  <Input
                    type="date"
                    value={newItemDueDate}
                    onChange={(e) => setNewItemDueDate(e.target.value)}
                    className="w-auto"
                  />
                </div>
                <div className="flex-1" />
                <Button size="sm" variant="ghost" onClick={() => setIsAddingItem(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleAddActionItem} disabled={!newItemTitle.trim()}>
                  Add
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {actionItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No action items yet</p>
            ) : (
              actionItems.map((item) => {
                const completed = item.status === "completed";
                const overdue = isOverdue(item);

                return (
                  <div
                    key={item.id}
                    className={`flex items-start space-x-3 p-3 rounded-lg transition-colors ${
                      completed
                        ? "bg-green-500/10 border border-green-500/20"
                        : "hover:bg-muted/30"
                    }`}
                  >
                    <Checkbox
                      checked={completed}
                      onCheckedChange={() => handleToggleItem(item)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium leading-none ${
                          completed
                            ? "text-green-700 dark:text-green-400 line-through"
                            : "text-foreground"
                        }`}
                      >
                        {item.title}
                      </p>
                      {item.due_date && (
                        <p
                          className={`text-xs mt-1 flex items-center gap-1 ${
                            completed
                              ? "text-green-600 dark:text-green-500"
                              : overdue
                              ? "text-red-600 dark:text-red-400 font-medium"
                              : "text-muted-foreground"
                          }`}
                        >
                          {overdue && <AlertCircle className="h-3 w-3" />}
                          {completed && item.completed_date
                            ? `Completed: ${format(new Date(item.completed_date), "MMM dd, yyyy")}`
                            : `Due: ${format(parseISO(item.due_date), "MMM dd, yyyy")}`}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Added by {item.created_by}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
};

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLibraryStore } from '@/stores/libraryStore';
import { cn } from '@/lib/utils';
import type { ProjectTemplate } from '@/lib/templates';

const TEMPLATES: { id: ProjectTemplate; title: string; description: string }[] = [
  { id: 'welcome', title: 'Guided tour', description: 'A small example board that teaches the basics.' },
  { id: 'mindmap', title: 'Mind map starter', description: 'A root idea with a few branches, ready to grow.' },
  { id: 'blank', title: 'Blank board', description: 'A single empty board. Start from scratch.' },
];

export function NewProjectDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createProject = useLibraryStore((s) => s.createProject);
  const [name, setName] = useState('');
  const [template, setTemplate] = useState<ProjectTemplate>('mindmap');

  const create = () => {
    createProject(name.trim() || 'Untitled Project', template);
    onOpenChange(false);
    setName('');
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setName('');
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Project</DialogTitle>
          <DialogDescription>Projects are stored locally on this computer.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="new-project-name">Project name</Label>
            <Input
              id="new-project-name"
              autoFocus
              placeholder="e.g. My Game GDD"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') create();
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Start from</Label>
            <div className="space-y-1.5">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={cn(
                    'w-full rounded-lg border px-3 py-2 text-left transition-colors',
                    template === t.id ? 'border-primary bg-primary/5' : 'hover:bg-accent',
                  )}
                  onClick={() => setTemplate(t.id)}
                >
                  <div className="text-sm font-medium">{t.title}</div>
                  <div className="text-xs text-muted-foreground">{t.description}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={create}>Create project</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

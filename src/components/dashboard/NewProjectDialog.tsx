import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLibraryStore } from '@/stores/libraryStore';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { ProjectTemplate } from '@/lib/templates';

const TEMPLATES: { id: ProjectTemplate; titleKey: string; descKey: string }[] = [
  { id: 'welcome', titleKey: 'np.tplWelcome', descKey: 'np.tplWelcomeDesc' },
  { id: 'mindmap', titleKey: 'np.tplMindmap', descKey: 'np.tplMindmapDesc' },
  { id: 'blank', titleKey: 'np.tplBlank', descKey: 'np.tplBlankDesc' },
];

export function NewProjectDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createProject = useLibraryStore((s) => s.createProject);
  const t = useT();
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
          <DialogTitle>{t('np.title')}</DialogTitle>
          <DialogDescription>{t('np.desc')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="new-project-name">{t('np.name')}</Label>
            <Input
              id="new-project-name"
              autoFocus
              placeholder={t('np.placeholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') create();
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t('np.startFrom')}</Label>
            <div className="space-y-1.5">
              {TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  className={cn(
                    'w-full rounded-lg border px-3 py-2 text-left transition-colors',
                    template === tpl.id ? 'border-primary bg-primary/5' : 'hover:bg-accent',
                  )}
                  onClick={() => setTemplate(tpl.id)}
                >
                  <div className="text-sm font-medium">{t(tpl.titleKey)}</div>
                  <div className="text-xs text-muted-foreground">{t(tpl.descKey)}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={create}>{t('np.create')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function RenameDialog({
  open,
  onOpenChange,
  title,
  label = 'Name',
  initial,
  confirmLabel = 'Save',
  onCommit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  label?: string;
  initial: string;
  confirmLabel?: string;
  onCommit: (value: string) => void;
}) {
  const [value, setValue] = useState(initial);

  useEffect(() => {
    if (open) setValue(initial);
  }, [open, initial]);

  const commit = () => {
    const trimmed = value.trim();
    if (trimmed) onCommit(trimmed);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            commit();
          }}
        >
          <Input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={(e) => e.target.select()}
            aria-label={label}
          />
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{confirmLabel}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface DeleteItemConfirmDialogProps {
    open: boolean;
    setOpen: (open: boolean) => void;
    itemTitle: string;
    contributorCount: number;
    loading: boolean;
    onConfirm: () => Promise<void> | void;
}

export default function DeleteItemConfirmDialog({
    open,
    setOpen,
    itemTitle,
    contributorCount,
    loading,
    onConfirm,
}: DeleteItemConfirmDialogProps) {
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="max-w-md rounded-2xl border border-amber-500/20 bg-slate-950/95 p-6 shadow-2xl backdrop-blur-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-amber-500">
                        <AlertTriangle className="h-5 w-5" />
                        Confirm Deletion
                    </DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground">
                        This action permanently removes the item and its contribution history.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 text-sm">
                    <p>
                        <span className="font-medium text-foreground">{contributorCount}</span> people already contributed to{' '}
                        <span className="font-medium text-foreground">{itemTitle}</span>.
                    </p>
                    <p className="text-muted-foreground">
                        Continue only if you are sure you want to remove this gift from the wishlist.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => setOpen(false)} disabled={loading}>
                        Cancel
                    </Button>
                    <Button variant="destructive" className="flex-1" onClick={onConfirm} disabled={loading}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete Anyway'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

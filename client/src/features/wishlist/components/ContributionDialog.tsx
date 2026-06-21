import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Coins, Loader2 } from 'lucide-react';
import type { Item } from '../types';
import { toCurrency } from '../helpers';

interface ContributionDialogProps {
    open: boolean;
    setOpen: (open: boolean) => void;
    item?: Item;
    amount: string;
    setAmount: (value: string) => void;
    message: string;
    setMessage: (value: string) => void;
    loading: boolean;
    onSubmit: () => Promise<void> | void;
}

export default function ContributionDialog({
    open,
    setOpen,
    item,
    amount,
    setAmount,
    message,
    setMessage,
    loading,
    onSubmit,
}: ContributionDialogProps) {
    const collected = item ? Number(item.collectedAmount) : 0;
    const price = item?.price ? Number(item.price) : 0;
    const remaining = item?.price ? Math.max(price - collected, 0) : 0;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="max-w-md rounded-2xl border border-white/10 bg-slate-950/90 p-6 shadow-2xl backdrop-blur-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-foreground">
                        <Coins className="h-5 w-5 text-amber-500" />
                        Chip In
                    </DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground">
                        Add your contribution amount and an optional note for the wishlist owner.
                    </DialogDescription>
                </DialogHeader>
                {item && (
                    <div className="space-y-4 pt-2">
                        <p className="text-muted-foreground text-sm">
                            Contributing to <span className="text-foreground font-medium">{item.title}</span>
                        </p>
                        {item.price && (
                            <div className="space-y-1.5 rounded-lg border border-white/10 bg-background/50 p-3">
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>${toCurrency(collected)} collected</span>
                                    <span>${toCurrency(remaining)} remaining</span>
                                </div>
                                <Progress value={(collected / price) * 100} className="h-2" />
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label>Amount ($)</Label>
                            <Input
                                type="number"
                                min="0"
                                step="0.01"
                                max={item.price ? remaining : undefined}
                                placeholder="e.g. 25"
                                value={amount}
                                onChange={(event) => setAmount(event.target.value)}
                                autoFocus
                                className="bg-background/80 border-white/10"
                            />
                            {item.price && (
                                <p className="text-xs text-muted-foreground">
                                    Max allowed right now: ${toCurrency(remaining)}
                                </p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>Message (optional)</Label>
                            <Input
                                placeholder="A short wish for this gift"
                                value={message}
                                onChange={(event) => setMessage(event.target.value)}
                                className="bg-background/80 border-white/10"
                            />
                        </div>
                        <Button onClick={onSubmit} disabled={loading} className="w-full h-11">
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                `Contribute $${amount || '0'}`
                            )}
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

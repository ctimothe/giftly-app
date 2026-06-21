import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, Sparkles } from 'lucide-react';

interface AddItemDialogProps {
    open: boolean;
    setOpen: (open: boolean) => void;
    itemTitle: string;
    setItemTitle: (value: string) => void;
    itemPrice: string;
    setItemPrice: (value: string) => void;
    itemUrl: string;
    itemImage: string;
    setItemImage: (value: string) => void;
    itemStory: string;
    setItemStory: (value: string) => void;
    scraping: boolean;
    submittingItem: boolean;
    onAddItem: () => Promise<void> | void;
    onUrlPaste: (value: string) => Promise<void> | void;
    onReset: () => void;
}

export default function AddItemDialog({
    open,
    setOpen,
    itemTitle,
    setItemTitle,
    itemPrice,
    setItemPrice,
    itemUrl,
    itemImage,
    setItemImage,
    itemStory,
    setItemStory,
    scraping,
    submittingItem,
    onAddItem,
    onUrlPaste,
    onReset,
}: AddItemDialogProps) {
    return (
        <div className="mb-8 text-center">
            <Dialog
                open={open}
                onOpenChange={(value) => {
                    setOpen(value);
                    if (!value) onReset();
                }}
            >
                <DialogTrigger asChild>
                    <Button size="lg" className="shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
                        <Plus className="mr-2" />
                        Add Item
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-w-xl rounded-2xl border border-white/10 bg-slate-950/85 p-6 shadow-2xl backdrop-blur-md">
                    <DialogHeader>
                        <DialogTitle className="text-foreground flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-primary" />
                            Add Gift Item
                        </DialogTitle>
                        <DialogDescription className="text-sm text-muted-foreground">
                            Add clear details so friends can reserve or contribute without confusion.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                        <div className="space-y-2">
                            <Label className="text-muted-foreground">
                                Product URL <span className="text-muted-foreground/50">(optional)</span>
                            </Label>
                            <Input
                                placeholder="Paste a product link to auto-fill title, price, and image"
                                value={itemUrl}
                                onChange={(e) => onUrlPaste(e.target.value)}
                                className="bg-background/80 border-white/10 text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-primary/70"
                            />
                            {scraping && (
                                <div className="text-sm text-muted-foreground flex items-center">
                                    <Loader2 className="h-3 w-3 animate-spin mr-2" />
                                    Auto-filling from URL...
                                </div>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label className="text-muted-foreground">Item Name *</Label>
                            <Input
                                placeholder="e.g. Mechanical keyboard, cooking class, weekend bag"
                                value={itemTitle}
                                onChange={(e) => setItemTitle(e.target.value)}
                                className="bg-background/80 border-white/10 text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-primary/70"
                                autoFocus
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-muted-foreground">Price ($)</Label>
                            <Input
                                placeholder="e.g. 120"
                                type="number"
                                value={itemPrice}
                                onChange={(e) => setItemPrice(e.target.value)}
                                className="bg-background/80 border-white/10 text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-primary/70"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-muted-foreground">Image URL (optional)</Label>
                            <Input
                                placeholder="https://images.example.com/item.jpg"
                                value={itemImage}
                                onChange={(e) => setItemImage(e.target.value)}
                                className="bg-background/80 border-white/10 text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-primary/70"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-muted-foreground">Note to self (optional)</Label>
                            <Input
                                placeholder="Why this item matters to you"
                                value={itemStory}
                                onChange={(e) => setItemStory(e.target.value)}
                                className="bg-background/80 border-white/10 text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-primary/70"
                            />
                        </div>
                        {itemImage && (
                            <div className="rounded-lg overflow-hidden border border-border">
                                <img src={itemImage} alt="Preview" className="w-full h-32 object-cover" />
                            </div>
                        )}
                        <Button onClick={onAddItem} disabled={!itemTitle.trim() || submittingItem} className="w-full">
                            {submittingItem ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add to Wishlist'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

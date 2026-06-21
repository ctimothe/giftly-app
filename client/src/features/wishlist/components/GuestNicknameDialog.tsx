import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface GuestNicknameDialogProps {
    open: boolean;
    setOpen: (open: boolean) => void;
    guestNickname: string;
    setGuestNickname: (value: string) => void;
    onSubmit: () => void;
}

export default function GuestNicknameDialog({
    open,
    setOpen,
    guestNickname,
    setGuestNickname,
    onSubmit,
}: GuestNicknameDialogProps) {
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="max-w-md rounded-2xl border border-white/10 bg-slate-950/90 p-6 shadow-2xl backdrop-blur-md">
                <DialogHeader>
                    <DialogTitle className="text-foreground">What&apos;s your name?</DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground">
                        Your name is used for reservations and contributions on this wishlist.
                    </DialogDescription>
                </DialogHeader>
                <Input
                    placeholder="Enter your first name"
                    value={guestNickname}
                    onChange={(event) => setGuestNickname(event.target.value)}
                    onKeyDown={(event) => event.key === 'Enter' && onSubmit()}
                    autoFocus
                    className="bg-background/80 border-white/10"
                />
                <Button onClick={onSubmit} className="w-full h-11">Continue</Button>
            </DialogContent>
        </Dialog>
    );
}

import { ArrowLeft } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface BackButtonProps {
    className?: string;
    to?: string;
    label?: string;
}

export default function BackButton({ className, to, label = "Back" }: BackButtonProps) {
    const navigate = useNavigate();
    const location = useLocation();

    // Determine default behavior: if there's history state, go back; otherwise go to root
    const handleBack = () => {
        if (to) {
            navigate(to);
        } else if (location.key !== 'default') {
            navigate(-1);
        } else {
            navigate('/');
        }
    };

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={handleBack}
            className={`gap-2 active:scale-95 transition-all shadow-sm ${className}`}
        >
            <ArrowLeft className="h-4 w-4" />
            <span>{label}</span>
        </Button>
    );
}

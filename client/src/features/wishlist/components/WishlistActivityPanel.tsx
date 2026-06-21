import { AnimatePresence, motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import type { ActivityEvent } from '../types';

interface WishlistActivityPanelProps {
    events: ActivityEvent[];
    show: boolean;
}

export default function WishlistActivityPanel({ events, show }: WishlistActivityPanelProps) {
    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden mb-6"
                >
                    <div className="glass rounded-xl p-4 max-h-48 overflow-y-auto space-y-2">
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                            Live Activity
                        </h4>
                        {events.map(event => (
                            <div key={event.id} className="flex items-center gap-2 text-xs text-gray-400">
                                <MessageCircle className="h-3 w-3 text-gray-600 shrink-0" />
                                <span>{event.message}</span>
                                <span className="ml-auto text-gray-600 shrink-0">
                                    {event.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

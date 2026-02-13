import { motion } from 'framer-motion';

interface FluidBackgroundProps {
    colors: [string, string];
    opacity?: number;
    className?: string;
}

/**
 * FluidBackground - A creative, premium animated background mesh.
 * Uses multiple moving blobs of color for a high-end, dynamic feel.
 */
export default function FluidBackground({ colors, opacity = 0.2, className = "" }: FluidBackgroundProps) {
    return (
        <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
            {/* Blob 1 */}
            <motion.div
                animate={{
                    x: [0, 40, -40, 0],
                    y: [0, -30, 30, 0],
                    scale: [1, 1.2, 0.9, 1]
                }}
                transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "linear"
                }}
                className="absolute -top-[20%] -left-[10%] w-[80%] h-[80%] rounded-full blur-[120px]"
                style={{ background: colors[0], opacity, willChange: 'transform' }}
            />
            {/* Blob 2 */}
            <motion.div
                animate={{
                    x: [0, -50, 50, 0],
                    y: [0, 40, -40, 0],
                }}
                transition={{
                    duration: 25,
                    repeat: Infinity,
                    ease: "linear"
                }}
                className="absolute -bottom-[20%] -right-[10%] w-[70%] h-[70%] rounded-full blur-[100px]"
                style={{ background: colors[1], opacity, willChange: 'transform' }}
            />
            {/* Blob 3 */}
            <motion.div
                animate={{
                    x: [0, 60, -60, 0],
                    y: [0, 20, -20, 0],
                }}
                transition={{
                    duration: 15,
                    repeat: Infinity,
                    ease: "linear"
                }}
                className="absolute top-[20%] right-[10%] w-[50%] h-[50%] rounded-full blur-[110px]"
                style={{ background: colors[0], opacity: opacity * 0.5, willChange: 'transform' }}
            />
        </div>
    );
}

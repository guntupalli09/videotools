import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface ToolIconProps {
  icon: LucideIcon;
  gradientFrom: string;
  gradientTo: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  animate?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'w-10 h-10',
  md: 'w-12 h-12',
  lg: 'w-14 h-14',
  xl: 'w-16 h-16',
};

const iconSizeClasses = {
  sm: 'w-5 h-5',
  md: 'w-6 h-6',
  lg: 'w-7 h-7',
  xl: 'w-8 h-8',
};

export function ToolIcon({
  icon: Icon,
  gradientFrom,
  gradientTo,
  size = 'md',
  animate = false,
  className = '',
}: ToolIconProps) {
  const content = (
    <div
      className={`${sizeClasses[size]} rounded-2xl bg-gradient-to-br ${gradientFrom} ${gradientTo} flex items-center justify-center shadow-lg ${className}`}
    >
      <Icon className={`${iconSizeClasses[size]} text-white`} />
    </div>
  );

  if (animate) {
    return (
      <motion.div whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }} transition={{ duration: 0.3 }}>
        {content}
      </motion.div>
    );
  }

  return content;
}

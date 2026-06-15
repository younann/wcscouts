import { cn } from '@/lib/utils';

interface Props {
  className?: string;
}

export function Copyright({ className }: Props) {
  const year = new Date().getFullYear();
  return (
    <div
      className={cn(
        'text-center text-[11px] text-cream/40 py-4 select-none',
        className
      )}
    >
      © {year} ·{' '}
      <a
        href="https://devultra.net"
        target="_blank"
        rel="noopener noreferrer"
        className="text-gold-300/70 hover:text-gold-300 font-semibold"
      >
        DEVULTA
      </a>
    </div>
  );
}

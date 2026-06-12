import Link from 'next/link';
import { ScoutLogo } from './ScoutLogo';

interface Props {
  appName: string;
  rightSlot?: React.ReactNode;
}

export function AppHeader({ appName, rightSlot }: Props) {
  return (
    <header className="px-5 pt-5 pb-3 flex items-center justify-between">
      <Link href="/home" className="flex items-center gap-2.5">
        <ScoutLogo size={44} />
        <span className="text-lg font-black gold-text">{appName}</span>
      </Link>
      {rightSlot}
    </header>
  );
}

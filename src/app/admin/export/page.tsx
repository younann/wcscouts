import { getT } from '@/lib/i18n/server';
import { Download } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ExportPage() {
  const { t } = await getT();
  return (
    <main className="px-5 pb-10 flex flex-col gap-4">
      <h1 className="text-xl font-black text-emerald-900">{t.admin.export}</h1>
      <div className="grid grid-cols-1 gap-3">
        <a href="/api/admin/export?kind=leaderboard" className="card flex items-center justify-between font-semibold">
          <span>Leaderboard.csv</span>
          <Download className="h-5 w-5 text-emerald-600" />
        </a>
        <a href="/api/admin/export?kind=predictions" className="card flex items-center justify-between font-semibold">
          <span>All predictions.csv</span>
          <Download className="h-5 w-5 text-emerald-600" />
        </a>
        <a href="/api/admin/export?kind=matches" className="card flex items-center justify-between font-semibold">
          <span>Matches & results.csv</span>
          <Download className="h-5 w-5 text-emerald-600" />
        </a>
      </div>
    </main>
  );
}

import { createClient } from '@/lib/supabase/server';
import { getT } from '@/lib/i18n/server';
import { ScoringForm } from './ScoringForm';
import type { ScoringRule } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function ScoringPage() {
  const { t } = await getT();
  const supabase = await createClient();
  const { data } = await supabase.from('scoring_rules').select('*').order('key');
  const rules = (data ?? []) as ScoringRule[];
  return (
    <main className="px-5 pb-10 flex flex-col gap-4">
      <h1 className="text-xl font-black text-emerald-900">{t.admin.scoring}</h1>
      <ScoringForm initial={rules} saveLabel={t.common.save} />
      <p className="text-xs text-slate-500">
        These values are used the next time a match is scored. To re-score a finished match, edit and re-trigger from the matches page.
      </p>
    </main>
  );
}

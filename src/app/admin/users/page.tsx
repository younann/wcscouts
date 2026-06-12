import { createClient } from '@/lib/supabase/server';
import { getT } from '@/lib/i18n/server';
import { CreateUserForm } from './CreateUserForm';
import { ResetPasswordButton } from './ResetPasswordButton';
import type { Profile } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const { t } = await getT();
  const supabase = await createClient();
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .order('full_name', { ascending: true });
  const users = (data ?? []) as Profile[];

  return (
    <main className="px-5 pb-10 flex flex-col gap-4">
      <h1 className="text-xl font-black text-emerald-900">{t.admin.users}</h1>

      <CreateUserForm
        labels={{
          title: t.admin.createUser,
          fullName: 'Full name',
          username: t.auth.username,
          group: t.profile.group,
          password: t.auth.password,
          submit: t.common.save,
        }}
      />

      <div className="flex flex-col gap-2">
        {users.map((u) => (
          <div key={u.id} className="card flex items-center justify-between">
            <div className="min-w-0">
              <div className="font-bold truncate">{u.full_name}</div>
              <div className="text-xs text-slate-500 truncate">
                @{u.username}
                {u.group_name ? ` · ${u.group_name}` : ''}
                {u.role === 'admin' && ' · admin'}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="chip bg-emerald-100 text-emerald-800">{u.total_points}</span>
              <ResetPasswordButton userId={u.id} label={t.admin.resetPassword} />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

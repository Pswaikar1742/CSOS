'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Shield } from 'lucide-react';
import type { CSOSRole } from '@/lib/types';
import { ROLE_THEMES } from '@/lib/types';

const ROLES: CSOSRole[] = ['police', 'rto', 'sanitation', 'god-view'];

export default function LoginPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<CSOSRole>('god-view');
  const [operatorId, setOperatorId] = useState('');
  const [passkey, setPasskey] = useState('');

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const maxAge = 60 * 60 * 8;
    document.cookie = `csos_role=${selectedRole}; path=/; max-age=${maxAge}; samesite=lax`;
    document.cookie = `csos_operator=${encodeURIComponent(operatorId || 'operator')}; path=/; max-age=${maxAge}; samesite=lax`;
    void passkey;
    const roleHome = selectedRole === 'god-view' ? '/god-view' : `/${selectedRole}`;
    router.push(`${roleHome}?view=dashboard`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-sky-900 to-emerald-900 p-6 text-white md:p-10">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-blue-100/90 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Back to Landing Page
        </Link>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <section className="rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-sm md:p-8">
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-emerald-300" />
              <h1 className="text-2xl font-bold tracking-wide">CSOS Auth Gateway</h1>
            </div>
            <p className="mt-4 text-sm text-blue-100/90">
              Sign in as an authenticated command operator to enter role-specific control rooms and the city god-view.
            </p>
            <div className="mt-6 space-y-2">
              {ROLES.map((role) => {
                const theme = ROLE_THEMES[role];
                return (
                  <div key={role} className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-xs">
                    <span className={`font-semibold ${theme.textClass}`}>{theme.label}</span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-sm md:p-8">
            <form className="space-y-4" onSubmit={onSubmit}>
              <div>
                <label htmlFor="operator" className="mb-1 block text-xs font-semibold tracking-wide text-blue-100">
                  Operator ID
                </label>
                <input
                  id="operator"
                  type="text"
                  value={operatorId}
                  onChange={(event) => setOperatorId(event.target.value)}
                  placeholder="e.g. CSN_OP_01"
                  className="w-full rounded-lg border border-white/30 bg-slate-950/50 px-3 py-2 text-sm text-white outline-none ring-0 placeholder:text-slate-300 focus:border-emerald-300"
                  required
                />
              </div>

              <div>
                <label htmlFor="passkey" className="mb-1 block text-xs font-semibold tracking-wide text-blue-100">
                  Passkey
                </label>
                <input
                  id="passkey"
                  type="password"
                  value={passkey}
                  onChange={(event) => setPasskey(event.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-white/30 bg-slate-950/50 px-3 py-2 text-sm text-white outline-none ring-0 placeholder:text-slate-300 focus:border-emerald-300"
                  required
                />
              </div>

              <div>
                <label htmlFor="role" className="mb-1 block text-xs font-semibold tracking-wide text-blue-100">
                  Access Role
                </label>
                <select
                  id="role"
                  value={selectedRole}
                  onChange={(event) => setSelectedRole(event.target.value as CSOSRole)}
                  className="w-full rounded-lg border border-white/30 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none focus:border-emerald-300"
                >
                  {ROLES.map((role) => (
                    <option key={role} value={role} className="bg-slate-900">
                      {ROLE_THEMES[role].label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-300/60 bg-emerald-500/30 px-4 py-2.5 text-sm font-semibold transition hover:bg-emerald-500/45"
              >
                Login to Command Center
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}

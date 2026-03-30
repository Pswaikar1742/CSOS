import type { CSOSRole } from '@/lib/types';
import TopNav from '@/components/ui/TopNav';
import RoleSwitcher from '@/components/ui/RoleSwitcher';
import { cookies } from 'next/headers';

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const role = (cookieStore.get('csos_role')?.value ?? 'police') as CSOSRole;

  return (
    <div className="relative min-h-screen bg-[#F9FAFB]">
      <TopNav role={role} />
      <main className="pt-16">{children}</main>
      <RoleSwitcher currentRole={role} />
    </div>
  );
}

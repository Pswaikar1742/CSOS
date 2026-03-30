import type { CSOSRole } from '@/lib/types';
import CommandLayout from '@/components/ui/CommandLayout';
import { cookies } from 'next/headers';

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const role = (cookieStore.get('csos_role')?.value ?? 'police') as CSOSRole;

  return (
    <CommandLayout role={role}>
      {children}
    </CommandLayout>
  );
}

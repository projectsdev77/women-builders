import { pageActiveMember } from '@/lib/auth/guards';
import { MemberNav } from '@/components/member/nav';

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const user = await pageActiveMember();
  return (
    <>
      <MemberNav name={user.name} isAdmin={user.isAdmin} />
      <main id="main" className="mx-auto max-w-6xl px-4 py-6">
        {children}
      </main>
    </>
  );
}

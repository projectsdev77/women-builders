import { pageActiveMember } from '@/lib/auth/guards';
import { MemberNav } from '@/components/member/nav';
import { photoUrl } from '@/lib/services/photo-url';

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const user = await pageActiveMember();
  return (
    <>
      <MemberNav
        name={user.name}
        isAdmin={user.isAdmin}
        isReviewer={user.isReviewer}
        role={user.profile.primaryRole}
        photoUrl={photoUrl(user.id, user.profile, 128)}
      />
      <div className="lg:pl-64">
        <main id="main" className="mx-auto max-w-[1120px] px-4 pb-[120px] pt-[22px] sm:px-[clamp(20px,3vw,40px)] lg:pb-24 lg:pt-[clamp(24px,4vw,44px)]">
          {children}
        </main>
      </div>
    </>
  );
}

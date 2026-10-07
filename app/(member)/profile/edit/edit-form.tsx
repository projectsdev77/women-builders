'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Card } from '@/components/ui';
import {
  CompletenessMeter,
  ProfileSections,
  SaveStatus,
  useProfileEditor,
  type EditableProfile,
} from '@/components/profile/profile-editor';

export function ProfileEditForm({ initial }: { initial: EditableProfile }) {
  const router = useRouter();
  const editor = useProfileEditor(initial);

  return (
    <form
      className="mx-auto max-w-3xl space-y-6"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        if (await editor.save()) router.refresh();
      }}
    >
      <div className="flex items-center justify-between">
        <h1>Edit profile</h1>
        <Link href="/profile" className="text-[14px] font-semibold underline underline-offset-4">View my profile</Link>
      </div>
      <div className="sticky top-0 z-10">
        <CompletenessMeter profile={editor.profile} />
      </div>
      <Card className="p-6">
        <ProfileSections
          profile={editor.profile}
          setProfile={editor.setProfile}
          error={editor.error}
          sections={['basics', 'roles', 'about', 'needs', 'privacy']}
        />
      </Card>
      <div className="flex items-center justify-end gap-3">
        <SaveStatus saving={editor.saving} savedAt={editor.savedAt} error={editor.error} />
        <Button type="submit" disabled={editor.saving}>Save profile</Button>
      </div>
    </form>
  );
}

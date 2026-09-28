import type { Metadata } from 'next';
import { pageActiveMember } from '@/lib/auth/guards';
import { getOwnProfile } from '@/lib/services/profiles';
import { toEditable } from '@/components/profile/to-editable';
import { ProfileEditForm } from './edit-form';

export const metadata: Metadata = { title: 'Edit profile' };

export default async function EditProfilePage() {
  const user = await pageActiveMember();
  const profile = await getOwnProfile(user.id);
  return <ProfileEditForm initial={toEditable(profile.user.name, profile)} />;
}

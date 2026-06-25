import { CreateGroupForm } from '@/components/groups/CreateGroupForm';

export const metadata = { title: 'Crear grupo' };

export default function NewGroupPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <CreateGroupForm />
    </div>
  );
}

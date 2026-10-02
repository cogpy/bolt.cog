import type { MetaFunction } from '@remix-run/cloudflare';
import { ClientOnly } from 'remix-utils/client-only';
import { DteWorkspace } from '~/components/dte/DteWorkspace.client';

export const meta: MetaFunction = () => [
  { title: 'Deep Tree Echo | Device Workspace' },
  {
    name: 'description',
    content: 'Role-tailored Deep Tree Echo device manager, definition editor, Core Self chat and APL253 rule console.',
  },
];

export default function DteRoute() {
  return (
    <ClientOnly fallback={<div style={{ padding: 24 }}>Loading DTE device workspace…</div>}>
      {() => <DteWorkspace />}
    </ClientOnly>
  );
}

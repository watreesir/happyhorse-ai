import { CreatePanel } from './create-panel';
import { MyCreationsPanel } from './my-creations-panel';
import { StudioTabs } from './studio-tabs';
import { StudioCopy } from '../_lib/types';

type StudioShellProps = {
  copy: StudioCopy;
};

export function StudioShell({ copy }: StudioShellProps) {
  return (
    <main className="relative px-4 pb-16 pt-24 md:pb-20 md:pt-28">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[360px] bg-[radial-gradient(circle_at_18%_20%,rgba(251,191,36,0.22),transparent_48%),radial-gradient(circle_at_85%_12%,rgba(14,165,233,0.18),transparent_44%),linear-gradient(to_bottom,rgba(250,250,250,0.95),rgba(255,255,255,0))] dark:bg-[radial-gradient(circle_at_18%_20%,rgba(251,191,36,0.18),transparent_48%),radial-gradient(circle_at_85%_12%,rgba(14,165,233,0.15),transparent_44%),linear-gradient(to_bottom,rgba(9,9,11,0.75),rgba(9,9,11,0))]" />

      <div className="mx-auto max-w-7xl space-y-6">
        <StudioTabs
          copy={copy.tabs}
          createPanel={<CreatePanel copy={copy} />}
          myCreationsPanel={
            <MyCreationsPanel
              copy={copy.myCreations}
              statusLabels={copy.create.status}
              errors={copy.errors}
            />
          }
        />
      </div>
    </main>
  );
}

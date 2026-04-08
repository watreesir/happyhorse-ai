import { CreatePanel } from './create-panel';
import { MyCreationsPanel } from './my-creations-panel';
import { StudioTabs } from './studio-tabs';
import { StudioCopy } from '../_lib/types';

type StudioShellProps = {
  copy: StudioCopy;
};

export function StudioShell({ copy }: StudioShellProps) {
  return (
    <main className="relative px-4 pb-16 pt-8 md:pb-20 md:pt-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[360px] bg-[radial-gradient(circle_at_18%_20%,rgba(251,191,36,0.22),transparent_48%),radial-gradient(circle_at_85%_12%,rgba(14,165,233,0.18),transparent_44%),linear-gradient(to_bottom,rgba(250,250,250,0.95),rgba(255,255,255,0))] dark:bg-[radial-gradient(circle_at_18%_20%,rgba(251,191,36,0.18),transparent_48%),radial-gradient(circle_at_85%_12%,rgba(14,165,233,0.15),transparent_44%),linear-gradient(to_bottom,rgba(9,9,11,0.75),rgba(9,9,11,0))]" />

      <div className="mx-auto max-w-7xl space-y-6">
        <header className="space-y-3 rounded-2xl border border-zinc-200/80 bg-white/85 p-5 shadow-[0_20px_36px_-32px_rgba(15,23,42,0.95)] backdrop-blur dark:border-zinc-700/70 dark:bg-zinc-900/65">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
            {copy.header.eyebrow}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 md:text-3xl dark:text-zinc-100">
            {copy.header.title}
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-zinc-600 md:text-base dark:text-zinc-300">
            {copy.header.description}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{copy.header.note}</p>
        </header>

        <StudioTabs
          copy={copy.tabs}
          createPanel={<CreatePanel copy={copy} />}
          myCreationsPanel={
            <MyCreationsPanel
              copy={copy.myCreations}
              statusLabels={copy.create.status}
            />
          }
        />
      </div>
    </main>
  );
}

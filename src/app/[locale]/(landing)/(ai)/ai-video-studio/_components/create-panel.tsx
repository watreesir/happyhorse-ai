'use client';

import { StudioCopy } from '../_lib/types';
import { HistoryPanel } from './history-panel';
import { InspirationPanel } from './inspiration-panel';
import { WorkspacePanel } from './workspace-panel';

type CreatePanelProps = {
  copy: StudioCopy;
};

export function CreatePanel({ copy }: CreatePanelProps) {
  return (
    <section className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(17rem,0.95fr)_minmax(0,1.3fr)_minmax(14rem,0.75fr)]">
        <div className="xl:col-start-1">
          <WorkspacePanel copy={copy.create.workspace} />
        </div>

        <div className="xl:col-start-2">
          <InspirationPanel
            copy={copy.create.inspiration}
            statusLabels={copy.create.status}
          />
        </div>

        <div className="xl:col-start-3">
          <HistoryPanel copy={copy.create.history} statusLabels={copy.create.status} />
        </div>
      </div>
    </section>
  );
}

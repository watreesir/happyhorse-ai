export type StudioTab = 'create' | 'my-creations';

export type VideoStatus = 'ready' | 'rendering' | 'queued' | 'failed';

export type VideoPalette =
  | 'copper'
  | 'teal'
  | 'ink'
  | 'amber'
  | 'slate'
  | 'crimson';

export type VideoDraft = {
  id: string;
  title: string;
  prompt: string;
  status: VideoStatus;
  updatedLabel: string;
  lengthLabel: string;
  aspectRatio: string;
  palette: VideoPalette;
};

export type InspirationDraft = VideoDraft & {
  recipeLabel: string;
};

export type StudioTaskLifecycle =
  | 'idle'
  | 'submitting'
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed';

export type VideoTaskRecord = {
  id: string;
  status: string;
  prompt: string;
  provider: string;
  model: string;
  scene: string;
  options: Record<string, unknown> | null;
  previewUrl: string | null;
  errorMessage: string | null;
  createdAt: string | number | Date;
  updatedAt: string | number | Date;
};

export type VideoTaskPageData = {
  items: VideoTaskRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type StudioCopy = {
  metadata: {
    title: string;
    description: string;
  };
  header: {
    eyebrow: string;
    title: string;
    description: string;
    note: string;
  };
  tabs: {
    create: {
      label: string;
      hint: string;
    };
    myCreations: {
      label: string;
      hint: string;
    };
  };
  create: {
    workspace: {
      panelTitle: string;
      panelHint: string;
      promptLabel: string;
      promptPlaceholder: string;
      promptRequired: string;
      uploadLabel: string;
      uploadHint: string;
      uploadSlots: {
        primary: string;
        optional: string;
      };
      ratioLabel: string;
      runButton: string;
      helper: string;
      statusLabel: string;
      statuses: Record<StudioTaskLifecycle, string>;
      submitErrorPrefix: string;
    };
    inspiration: {
      panelTitle: string;
      panelHint: string;
      applyButton: string;
      empty: string;
      recipePrefix: string;
    };
    history: {
      panelTitle: string;
      panelHint: string;
      refreshButton: string;
      refreshingButton: string;
      empty: string;
    };
    status: Record<VideoStatus, string>;
  };
  myCreations: {
    panelTitle: string;
    panelHint: string;
    refreshButton: string;
    refreshingButton: string;
    emptyTitle: string;
    emptyDescription: string;
    pageLabel: string;
    totalLabel: string;
    previousLabel: string;
    nextLabel: string;
  };
};

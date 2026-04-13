export type StudioTab = 'create' | 'my-creations';

export type VideoStatus = 'ready' | 'rendering' | 'queued' | 'failed';

export type StudioMode =
  | 'text-to-video'
  | 'image-to-video'
  | 'reference-to-video'
  | 'video-edit';

export type StudioI2VMode =
  | 'first-frame'
  | 'first-last-frame'
  | 'video-continuation';

export type StudioResolution = '720p' | '1080p';

export type StudioAudioSetting = 'auto' | 'origin';

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
  previewUrl?: string | null;
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

export type StudioErrorCopy = {
  authRequired: string;
  creditsInsufficient: string;
  uploadTooLarge: string;
  permissionDenied: string;
  taskUnavailable: string;
  rateLimited: string;
  networkIssue: string;
  serverBusy: string;
  submitFailed: string;
  queryFailed: string;
  listFailed: string;
  deleteFailed: string;
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
  errors: StudioErrorCopy;
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
      modeLabel: string;
      modeHint: string;
      modes: Record<StudioMode, string>;
      i2vModeLabel: string;
      i2vModes: Record<StudioI2VMode, string>;
      i2vCapabilityHint: string;
      promptLabel: string;
      promptPlaceholder: string;
      promptRequired: string;
      statusRetrying: string;
      statusSyncError: string;
      uploadLabel: string;
      uploadHint: string;
      uploads: {
        addFile: string;
        replaceFile: string;
        removeFile: string;
        uploading: string;
        textAudio: string;
        i2vFirstFrame: string;
        i2vLastFrame: string;
        i2vFirstClip: string;
        i2vAudio: string;
        referenceMaterials: string;
        referenceFirstFrame: string;
        referenceVoice: string;
        editVideo: string;
        editReferenceImage: string;
        materialLimitHint: string;
        materialsCount: string;
      };
      ratioLabel: string;
      resolutionLabel: string;
      durationLabel: string;
      durationValues: number[];
      editDurationValues: number[];
      resolutionValues: StudioResolution[];
      audioSettingLabel: string;
      audioSettings: Record<StudioAudioSetting, string>;
      runButton: string;
      generatingToast: string;
      guestGenerateHint: string;
      guestTaskBanner: string;
      guestTaskBannerAction: string;
      guestLoginModalTitle: string;
      guestLoginModalContinue: string;
      guestLoginModalNotify: string;
      guestLoginModalAction: string;
      guestLoginModalLater: string;
      submitFromHero: string;
      helper: string;
      statusLabel: string;
      statuses: Record<StudioTaskLifecycle, string>;
      submitErrorPrefix: string;
      validationErrors: {
        promptRequired: string;
        imageFirstFrameRequired: string;
        imageFirstLastFrameRequired: string;
        imageFirstClipRequired: string;
        referenceMaterialRequired: string;
        editVideoRequired: string;
      };
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
      generatingLabel: string;
      previewButton: string;
      previewTitle: string;
      previewHint: string;
      downloadButton: string;
      loading: string;
      errorFallback: string;
      empty: string;
    };
    status: Record<VideoStatus, string>;
  };
  myCreations: {
    panelTitle: string;
    panelHint: string;
    refreshButton: string;
    refreshingButton: string;
    loading: string;
    errorFallback: string;
    emptyTitle: string;
    emptyDescription: string;
    pageLabel: string;
    totalLabel: string;
    previousLabel: string;
    nextLabel: string;
    actions: {
      view: string;
      previewButton: string;
      previewTitle: string;
      previewHint: string;
      download: string;
      delete: string;
      deleting: string;
      deleteConfirm: string;
      deleteSuccess: string;
      unavailable: string;
    };
  };
};

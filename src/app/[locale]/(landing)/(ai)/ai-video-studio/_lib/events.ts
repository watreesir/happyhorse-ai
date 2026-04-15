import {
  VideoStudioDraft,
  VideoStudioI2VMode,
  VideoStudioMode,
} from '@/shared/lib/video-studio-workflow';

export const VIDEO_STUDIO_REFRESH_EVENT = 'video-studio:refresh';

export type VideoStudioRefreshReason =
  | 'submit'
  | 'status'
  | 'history-refresh'
  | 'creations-refresh';

export type VideoStudioRefreshEventDetail = {
  reason: VideoStudioRefreshReason;
};

export function dispatchVideoStudioRefresh(reason: VideoStudioRefreshReason) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<VideoStudioRefreshEventDetail>(VIDEO_STUDIO_REFRESH_EVENT, {
      detail: { reason },
    })
  );
}

export const VIDEO_STUDIO_RECREATE_EVENT = 'video-studio:recreate';

export type VideoStudioRecreateEventDetail = {
  draft?: Partial<VideoStudioDraft>;
  mode?: VideoStudioMode;
  prompt?: string;
  i2vMode?: VideoStudioI2VMode;
  /** Raw public image URL to fetch and upload into the first-frame slot */
  imageUrl?: string;
};

export function dispatchVideoStudioRecreate(detail: VideoStudioRecreateEventDetail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<VideoStudioRecreateEventDetail>(VIDEO_STUDIO_RECREATE_EVENT, { detail })
  );
}

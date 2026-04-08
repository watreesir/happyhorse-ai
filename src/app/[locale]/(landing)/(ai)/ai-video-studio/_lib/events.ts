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

import {
  VideoStudioMediaType,
  VideoStudioUploadedAsset,
} from './video-studio-workflow';

type UploadMediaResponse = {
  code: number;
  message?: string;
  data?: {
    urls: string[];
    results: Array<{
      url: string;
      key: string;
      filename: string;
      mimeType: string;
      mediaType: VideoStudioMediaType;
    }>;
  };
};

const DEFAULT_UPLOAD_MAX_FILE_BYTES = 4 * 1024 * 1024;

function formatBytesToMb(bytes: number) {
  return Math.max(1, Math.floor(bytes / (1024 * 1024)));
}

function getUploadMaxFileBytes() {
  const raw = process.env.NEXT_PUBLIC_STUDIO_UPLOAD_MAX_FILE_BYTES;
  const parsed = Number.parseInt(raw || '', 10);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return DEFAULT_UPLOAD_MAX_FILE_BYTES;
}

function resolveMediaType(mimeType: string): VideoStudioMediaType | null {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return null;
}

function readVideoDurationSeconds(file: File) {
  if (typeof document === 'undefined' || !file.type.startsWith('video/')) {
    return Promise.resolve<number | undefined>(undefined);
  }

  return new Promise<number | undefined>((resolve) => {
    const video = document.createElement('video');
    const objectUrl = URL.createObjectURL(file);
    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      video.removeAttribute('src');
      video.load();
    };
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const duration = video.duration;
      cleanup();
      resolve(Number.isFinite(duration) && duration > 0 ? duration : undefined);
    };
    video.onerror = () => {
      cleanup();
      resolve(undefined);
    };
    video.src = objectUrl;
  });
}

export async function uploadStudioMediaFiles(files: File[]) {
  if (!files.length) {
    return [] as VideoStudioUploadedAsset[];
  }

  const maxFileBytes = getUploadMaxFileBytes();
  const oversized = files.find((file) => file.size > maxFileBytes);
  if (oversized) {
    throw new Error(
      `upload too large: keep each file under ${formatBytesToMb(maxFileBytes)}MB`
    );
  }

  const durationSecondsByIndex = await Promise.all(
    files.map((file) => readVideoDurationSeconds(file))
  );

  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', file);
  });

  const response = await fetch('/api/storage/upload-media', {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    if (response.status === 413) {
      throw new Error(
        `upload too large: keep each file under ${formatBytesToMb(maxFileBytes)}MB`
      );
    }
    throw new Error(`request failed with status: ${response.status}`);
  }

  const payload = (await response.json()) as UploadMediaResponse;
  if (payload.code !== 0 || !payload.data) {
    throw new Error(payload.message || 'upload failed');
  }

  return payload.data.results
    .map((item, index) => {
      const mediaType = resolveMediaType(item.mimeType) || item.mediaType;
      if (!mediaType) return null;
      return {
        url: item.url,
        name: item.filename,
        mimeType: item.mimeType,
        mediaType,
        durationSeconds: durationSecondsByIndex[index],
      } as VideoStudioUploadedAsset;
    })
    .filter((item): item is VideoStudioUploadedAsset => Boolean(item));
}

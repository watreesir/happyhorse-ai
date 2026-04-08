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

function resolveMediaType(mimeType: string): VideoStudioMediaType | null {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return null;
}

export async function uploadStudioMediaFiles(files: File[]) {
  if (!files.length) {
    return [] as VideoStudioUploadedAsset[];
  }

  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', file);
  });

  const response = await fetch('/api/storage/upload-media', {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    throw new Error(`request failed with status: ${response.status}`);
  }

  const payload = (await response.json()) as UploadMediaResponse;
  if (payload.code !== 0 || !payload.data) {
    throw new Error(payload.message || 'upload failed');
  }

  return payload.data.results
    .map((item) => {
      const mediaType = resolveMediaType(item.mimeType) || item.mediaType;
      if (!mediaType) return null;
      return {
        url: item.url,
        name: item.filename,
        mimeType: item.mimeType,
        mediaType,
      } as VideoStudioUploadedAsset;
    })
    .filter((item): item is VideoStudioUploadedAsset => Boolean(item));
}

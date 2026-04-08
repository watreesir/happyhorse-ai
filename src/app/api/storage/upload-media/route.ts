import { md5 } from '@/shared/lib/hash';
import { respData, respErr } from '@/shared/lib/resp';
import { getStorageService } from '@/shared/services/storage';

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'image/avif': 'avif',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
  'video/ogg': 'ogv',
  'video/x-msvideo': 'avi',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/mp4': 'm4a',
  'audio/aac': 'aac',
  'audio/ogg': 'ogg',
  'audio/webm': 'webm',
};

function normalizeMediaType(mimeType: string) {
  if (mimeType.startsWith('image/')) return 'image' as const;
  if (mimeType.startsWith('video/')) return 'video' as const;
  if (mimeType.startsWith('audio/')) return 'audio' as const;
  return null;
}

function extFromMime(file: File) {
  return (
    EXT_BY_MIME[file.type] ||
    file.name.split('.').pop()?.toLowerCase() ||
    'bin'
  );
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];
    if (!files.length) {
      return respErr('no files provided');
    }

    const storageService = await getStorageService();
    const results: Array<{
      url: string;
      key: string;
      filename: string;
      mimeType: string;
      mediaType: 'image' | 'video' | 'audio';
      deduped: boolean;
    }> = [];

    for (const file of files) {
      const mediaType = normalizeMediaType(file.type);
      if (!mediaType) {
        return respErr(`unsupported file type: ${file.type || file.name}`);
      }

      const arrayBuffer = await file.arrayBuffer();
      const body = new Uint8Array(arrayBuffer);
      const digest = md5(body);
      const ext = extFromMime(file);
      const key = `studio-media/${mediaType}/${digest}.${ext}`;

      const exists = await storageService.exists({ key });
      if (exists) {
        const publicUrl = storageService.getPublicUrl({ key });
        if (publicUrl) {
          results.push({
            url: publicUrl,
            key,
            filename: file.name,
            mimeType: file.type,
            mediaType,
            deduped: true,
          });
          continue;
        }
      }

      const upload = await storageService.uploadFile({
        body,
        key,
        contentType: file.type,
        disposition: 'inline',
      });
      if (!upload.success || !upload.url) {
        return respErr(upload.error || 'upload failed');
      }

      results.push({
        url: upload.url,
        key,
        filename: file.name,
        mimeType: file.type,
        mediaType,
        deduped: false,
      });
    }

    return respData({
      urls: results.map((item) => item.url),
      results,
    });
  } catch (error) {
    console.error('upload media failed:', error);
    return respErr('upload media failed');
  }
}

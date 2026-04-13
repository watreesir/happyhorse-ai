import { R2Provider, S3Provider, StorageManager } from '@/extensions/storage';
import { Configs, getAllConfigs } from '@/shared/models/config';

function trimTrailingSlash(input: string) {
  return input.replace(/\/+$/, '');
}

function trimLeadingSlash(input: string) {
  return input.replace(/^\/+/, '');
}

function getNormalizedR2UploadPath(configs: Configs) {
  const uploadPath = configs.r2_upload_path || 'uploads';
  return trimTrailingSlash(trimLeadingSlash(uploadPath));
}

function getR2Endpoint(configs: Configs) {
  if (configs.r2_endpoint) {
    return trimTrailingSlash(configs.r2_endpoint);
  }

  return `https://${configs.r2_account_id || ''}.r2.cloudflarestorage.com`;
}

function getOwnedStorageKeyFromUrl(
  fileUrl: string,
  configs: Configs
):
  | {
      providerName: 'r2' | 's3';
      key: string;
    }
  | null {
  const normalizedUrl = trimTrailingSlash(fileUrl.trim());

  if (
    configs.r2_access_key &&
    configs.r2_secret_key &&
    configs.r2_bucket_name
  ) {
    const uploadPath = getNormalizedR2UploadPath(configs);
    const r2Prefixes = [
      configs.r2_domain
        ? `${trimTrailingSlash(configs.r2_domain)}/${uploadPath}/`
        : '',
      `${getR2Endpoint(configs)}/${configs.r2_bucket_name}/${uploadPath}/`,
    ].filter(Boolean);

    for (const prefix of r2Prefixes) {
      if (normalizedUrl.startsWith(prefix)) {
        return {
          providerName: 'r2',
          key: decodeURIComponent(normalizedUrl.slice(prefix.length)),
        };
      }
    }
  }

  if (configs.s3_access_key && configs.s3_secret_key && configs.s3_bucket) {
    const s3Prefixes = [
      configs.s3_domain ? `${trimTrailingSlash(configs.s3_domain)}/` : '',
      configs.s3_endpoint
        ? `${trimTrailingSlash(configs.s3_endpoint)}/${configs.s3_bucket}/`
        : '',
    ].filter(Boolean);

    for (const prefix of s3Prefixes) {
      if (normalizedUrl.startsWith(prefix)) {
        return {
          providerName: 's3',
          key: decodeURIComponent(normalizedUrl.slice(prefix.length)),
        };
      }
    }
  }

  return null;
}

/**
 * get storage service with configs
 */
export function getStorageServiceWithConfigs(configs: Configs) {
  const storageManager = new StorageManager();

  // Add R2 provider if configured
  if (
    configs.r2_access_key &&
    configs.r2_secret_key &&
    configs.r2_bucket_name
  ) {
    // r2_region in settings stores the Cloudflare Account ID
    // For R2, region is typically "auto" but can be customized
    const accountId = configs.r2_account_id || '';

    storageManager.addProvider(
      new R2Provider({
        accountId: accountId,
        accessKeyId: configs.r2_access_key,
        secretAccessKey: configs.r2_secret_key,
        bucket: configs.r2_bucket_name,
        uploadPath: configs.r2_upload_path,
        region: 'auto', // R2 uses "auto" as region
        endpoint: configs.r2_endpoint, // Optional custom endpoint
        publicDomain: configs.r2_domain,
      }),
      true // Set R2 as default
    );
  }

  // Add S3 provider if configured (future support)
  if (configs.s3_access_key && configs.s3_secret_key && configs.s3_bucket) {
    storageManager.addProvider(
      new S3Provider({
        endpoint: configs.s3_endpoint,
        region: configs.s3_region,
        accessKeyId: configs.s3_access_key,
        secretAccessKey: configs.s3_secret_key,
        bucket: configs.s3_bucket,
        publicDomain: configs.s3_domain,
      })
    );
  }

  return storageManager;
}

/**
 * global storage service
 */
let storageService: StorageManager | null = null;

/**
 * get storage service instance
 */
export async function getStorageService(
  configs?: Configs
): Promise<StorageManager> {
  if (!configs) {
    configs = await getAllConfigs();
  }
  storageService = getStorageServiceWithConfigs(configs);

  return storageService;
}

export async function deleteOwnedStorageFileByUrl(
  fileUrl: string,
  configs?: Configs
) {
  if (!configs) {
    configs = await getAllConfigs();
  }

  const resolved = getOwnedStorageKeyFromUrl(fileUrl, configs);
  if (!resolved) {
    return {
      deleted: false,
      skipped: true,
      reason: 'not-owned',
      key: '',
    };
  }

  // User uploads are reused across creation flows and must not be removed here.
  if (resolved.key.startsWith('studio-media/')) {
    return {
      deleted: false,
      skipped: true,
      reason: 'protected-input',
      key: resolved.key,
    };
  }

  const service = await getStorageService(configs);
  const deleted = await service.deleteObject({
    key: resolved.key,
    providerName: resolved.providerName,
  });

  return {
    deleted,
    skipped: false,
    reason: deleted ? '' : 'delete-failed',
    key: resolved.key,
  };
}

import type { AppId } from './host';

export type ManifestFileV1 = {
  path: string;
  sha256: string;
  bytes: number;
  contentType: string;
  licenseId: string;
  sourceIds: string[];
};

export type DataManifestV1 = {
  manifestVersion: 1;
  appId: AppId;
  buildVersion: string;
  contentVersion: string;
  schemaVersions: Record<string, number>;
  createdAt: string;
  rollbackBuildVersion: string | null;
  files: ManifestFileV1[];
  datasets: Array<{
    datasetId: string;
    version: string;
    retrievedAt: string;
    sourceUrl: string;
    licenseId: string;
    transformVersion: string;
    outputSha256: string;
  }>;
  totalBytes: number;
};

export type ManifestErrorCode =
  | 'FILE_MISSING'
  | 'HASH_MISMATCH'
  | 'LICENSE_UNKNOWN'
  | 'CACHE_INCOMPLETE'
  | 'ROLLBACK_MISSING'
  | 'DUPLICATE_PATH';

export type ManifestValidation =
  | { valid: true }
  | { valid: false; errors: Array<{ code: ManifestErrorCode; path?: string }> };

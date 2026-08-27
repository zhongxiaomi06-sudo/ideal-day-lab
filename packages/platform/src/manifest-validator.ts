import type { DataManifestV1, ManifestValidation } from '@eazo/contracts';

export const validateManifestShape = (
  manifest: DataManifestV1,
  approvedLicenses: ReadonlySet<string>,
  availablePaths: ReadonlySet<string>,
): ManifestValidation => {
  const errors: Extract<ManifestValidation, { valid: false }>['errors'] = [];
  const seen = new Set<string>();
  for (const file of manifest.files) {
    if (seen.has(file.path)) errors.push({ code: 'DUPLICATE_PATH', path: file.path });
    seen.add(file.path);
    if (!availablePaths.has(file.path)) errors.push({ code: 'FILE_MISSING', path: file.path });
    if (!/^[a-f0-9]{64}$/.test(file.sha256)) errors.push({ code: 'HASH_MISMATCH', path: file.path });
    if (!approvedLicenses.has(file.licenseId)) errors.push({ code: 'LICENSE_UNKNOWN', path: file.path });
  }
  if (!manifest.rollbackBuildVersion) errors.push({ code: 'ROLLBACK_MISSING' });
  return errors.length ? { valid: false, errors } : { valid: true };
};

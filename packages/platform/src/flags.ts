import type { FeatureFlagV1, FlagErrorCode, KillSwitchV1 } from '@eazo/contracts';

export type FlagResolution =
  | { enabled: boolean; source: 'config' | 'cache' | 'default' }
  | { enabled: false; source: 'default'; error: FlagErrorCode };

export const resolveFlag = (
  id: string,
  knownIds: ReadonlySet<string>,
  config: FeatureFlagV1 | null,
  now: Date,
): FlagResolution => {
  if (!knownIds.has(id)) return { enabled: false, source: 'default', error: 'FLAG_UNKNOWN' };
  if (!config || config.id !== id || !config.owner || !config.reason) return { enabled: false, source: 'default', error: 'FLAG_CONFIG_INVALID' };
  if (config.expiresAt && Date.parse(config.expiresAt) <= now.getTime()) return { enabled: false, source: 'default', error: 'FLAG_EXPIRED' };
  return { enabled: config.enabled, source: 'config' };
};

export const evaluateKillSwitch = (
  buildVersion: string,
  featureId: string,
  contentId: string | null,
  killSwitch: KillSwitchV1,
): FlagErrorCode | null => {
  if (buildVersion.localeCompare(killSwitch.minimumSafeBuildVersion, undefined, { numeric: true }) < 0) return 'MIN_VERSION_REQUIRED';
  if (contentId && killSwitch.disabledContentIds.includes(contentId)) return 'CONTENT_WITHDRAWN';
  if (killSwitch.disabledFeatures.includes(featureId)) return 'CONTENT_WITHDRAWN';
  return null;
};

export type FeatureFlagV1 = {
  id: string;
  enabled: boolean;
  scope: 'build' | 'launch' | 'session';
  owner: string;
  reason: string;
  expiresAt: string | null;
};

export type KillSwitchV1 = {
  disabledFeatures: string[];
  disabledContentIds: string[];
  minimumSafeBuildVersion: string;
  issuedAt: string;
  reasonCode: string;
};

export type FlagErrorCode =
  | 'FLAG_UNKNOWN'
  | 'FLAG_EXPIRED'
  | 'FLAG_CONFIG_INVALID'
  | 'CONTENT_WITHDRAWN'
  | 'MIN_VERSION_REQUIRED';

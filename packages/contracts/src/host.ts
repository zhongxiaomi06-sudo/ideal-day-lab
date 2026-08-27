export type AppId =
  | 'ideal-day-lab'
  | 'scroll-to-space'
  | 'life-elsewhere-now'
  | 'who-shared-the-year'
  | 'weird-matter-lab';

export type HostErrorCode =
  | 'UNSUPPORTED'
  | 'PERMISSION_DENIED'
  | 'TIMEOUT'
  | 'INVALID_PAYLOAD'
  | 'RATE_LIMITED'
  | 'SESSION_QUOTA_EXCEEDED'
  | 'OFFLINE'
  | 'INTERNAL';

export type HostResult<T = undefined> =
  | { ok: true; value: T }
  | { ok: false; code: HostErrorCode; retryable: boolean; messageKey: string };

export type HostCapabilities = {
  aiClassification: boolean;
  speechTranscription: boolean;
  translation: boolean;
  cacheBundle: boolean;
  share: boolean;
  remix: boolean;
  resize: boolean;
  anonymousTelemetry: boolean;
};

export type PlanDraftV1 = {
  schemaVersion: 1;
  blocks: Array<{
    title: string;
    categoryId: string;
    startMin?: number;
    endMin?: number;
    durationMin?: number;
    confidence?: number;
  }>;
};

export type SharePayload = {
  appId: AppId;
  schemaVersion: number;
  publicData: Record<string, unknown>;
  previewImage?: Blob;
};

export type RemixPayload = {
  appId: AppId;
  schemaVersion: number;
  content: Record<string, unknown>;
  checksum: string;
};

export type TelemetryEvent = {
  name: string;
  eventVersion: number;
  anonymousSessionId: string;
  properties: Record<string, string | number | boolean | null>;
};

export interface EazoHostPort {
  getLaunchParams(): Promise<Record<string, string>>;
  getLocale(): Promise<string>;
  getOptionalUserId(): Promise<string | null>;
  classifyDay(payload: { requestId: string; locale: string; text: string; schemaVersion: 1 }): Promise<HostResult<PlanDraftV1>>;
  transcribeAudio(payload: { requestId: string; locale: string; audio: Blob; deleteSourceAfterTranscription: true }): Promise<HostResult<{ transcript: string; sourceDeleted: boolean }>>;
  translateMessages(payload: { locale: string; messages: Record<string, string> }): Promise<HostResult<Record<string, string>>>;
  cacheBundle(payload: { appId: AppId; version: string; urls: string[]; expectedBytes: number }): Promise<HostResult<{ cachedUrls: string[]; failedUrls: string[] }>>;
  getCacheStatus(payload: { appId: AppId; version: string }): Promise<HostResult<{ complete: boolean; cachedBytes: number }>>;
  clearCache(payload: { appId: AppId; beforeVersion?: string }): Promise<HostResult>;
  share(payload: SharePayload): Promise<HostResult<{ shareId: string; url: string }>>;
  remix(payload: RemixPayload): Promise<HostResult<{ remixId: string; launchParams: Record<string, string> }>>;
  track(event: TelemetryEvent): Promise<HostResult>;
  requestResize(heightPx: number): void;
  getCapabilities(): Promise<HostCapabilities>;
}

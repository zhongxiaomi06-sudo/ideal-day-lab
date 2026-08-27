import type {
  EazoHostPort,
  HostCapabilities,
  HostErrorCode,
  HostResult,
  PlanDraftV1,
  RemixPayload,
  SharePayload,
  TelemetryEvent,
} from '@eazo/contracts';

const unsupported = <T>(messageKey: string): HostResult<T> => ({
  ok: false,
  code: 'UNSUPPORTED',
  retryable: false,
  messageKey,
});

const defaultCapabilities: HostCapabilities = {
  aiClassification: false,
  speechTranscription: false,
  translation: false,
  cacheBundle: false,
  share: false,
  remix: false,
  resize: true,
  anonymousTelemetry: true,
};

export class WebFallbackAdapter implements EazoHostPort {
  async getLaunchParams(): Promise<Record<string, string>> {
    return Object.fromEntries(new URLSearchParams(globalThis.location?.search ?? ''));
  }
  async getLocale(): Promise<string> { return globalThis.navigator?.language ?? 'en-US'; }
  async getOptionalUserId(): Promise<null> { return null; }
  async classifyDay(_payload: Parameters<EazoHostPort['classifyDay']>[0]): Promise<HostResult<PlanDraftV1>> { return unsupported('host.ai.unsupported'); }
  async transcribeAudio(_payload: Parameters<EazoHostPort['transcribeAudio']>[0]): Promise<HostResult<{ transcript: string; sourceDeleted: boolean }>> { return unsupported('host.speech.unsupported'); }
  async translateMessages(_payload: Parameters<EazoHostPort['translateMessages']>[0]): Promise<HostResult<Record<string, string>>> { return unsupported('host.translation.unsupported'); }
  async cacheBundle(_payload: Parameters<EazoHostPort['cacheBundle']>[0]): Promise<HostResult<{ cachedUrls: string[]; failedUrls: string[] }>> { return unsupported('host.cache.unsupported'); }
  async getCacheStatus(_payload: Parameters<EazoHostPort['getCacheStatus']>[0]): Promise<HostResult<{ complete: boolean; cachedBytes: number }>> { return unsupported('host.cache.unsupported'); }
  async clearCache(_payload: Parameters<EazoHostPort['clearCache']>[0]): Promise<HostResult> { return unsupported('host.cache.unsupported'); }
  async share(_payload: SharePayload): Promise<HostResult<{ shareId: string; url: string }>> { return unsupported('host.share.unsupported'); }
  async remix(_payload: RemixPayload): Promise<HostResult<{ remixId: string; launchParams: Record<string, string> }>> { return unsupported('host.remix.unsupported'); }
  async track(_event: TelemetryEvent): Promise<HostResult> { return { ok: true, value: undefined }; }
  requestResize(heightPx: number): void { globalThis.parent?.postMessage({ type: 'eazo:resize', heightPx }, '*'); }
  async getCapabilities(): Promise<HostCapabilities> { return defaultCapabilities; }
}

type FakeOptions = {
  error?: HostErrorCode;
  capabilities?: Partial<HostCapabilities>;
};

export class FakeEazoAdapter extends WebFallbackAdapter {
  readonly calls: string[] = [];
  readonly #options: FakeOptions;

  constructor(options: FakeOptions = {}) { super(); this.#options = options; }

  #failure<T>(): HostResult<T> | null {
    return this.#options.error
      ? { ok: false, code: this.#options.error, retryable: this.#options.error === 'TIMEOUT', messageKey: `host.${this.#options.error.toLowerCase()}` }
      : null;
  }

  override async getCapabilities(): Promise<HostCapabilities> {
    return { ...defaultCapabilities, aiClassification: true, cacheBundle: true, share: true, remix: true, ...this.#options.capabilities };
  }

  override async classifyDay(payload: Parameters<EazoHostPort['classifyDay']>[0]): Promise<HostResult<PlanDraftV1>> {
    this.calls.push('classifyDay');
    const failure = this.#failure<PlanDraftV1>();
    if (failure) return failure;
    const categories = payload.text.split(/[,，]/).map((value) => value.trim()).filter(Boolean);
    const duration = Math.floor(1440 / Math.max(categories.length, 1));
    return {
      ok: true,
      value: {
        schemaVersion: 1,
        blocks: (categories.length ? categories : ['Sleep', 'Create', 'Explore']).map((title, index, values) => ({
          title,
          categoryId: `fixture-${index + 1}`,
          durationMin: index === values.length - 1 ? 1440 - duration * index : duration,
          confidence: 1,
        })),
      },
    };
  }

  override async share(payload: SharePayload): Promise<HostResult<{ shareId: string; url: string }>> {
    this.calls.push('share'); const failure = this.#failure<{ shareId: string; url: string }>(); if (failure) return failure;
    return { ok: true, value: { shareId: `fixture-${payload.appId}`, url: `https://example.invalid/share/${payload.appId}` } };
  }

  override async remix(payload: RemixPayload): Promise<HostResult<{ remixId: string; launchParams: Record<string, string> }>> {
    this.calls.push('remix'); const failure = this.#failure<{ remixId: string; launchParams: Record<string, string> }>(); if (failure) return failure;
    return { ok: true, value: { remixId: `fixture-${payload.appId}`, launchParams: { checksum: payload.checksum } } };
  }

  override async cacheBundle(payload: Parameters<EazoHostPort['cacheBundle']>[0]): Promise<HostResult<{ cachedUrls: string[]; failedUrls: string[] }>> {
    this.calls.push('cacheBundle'); const failure = this.#failure<{ cachedUrls: string[]; failedUrls: string[] }>(); if (failure) return failure;
    return { ok: true, value: { cachedUrls: [...payload.urls], failedUrls: [] } };
  }
}

type InjectedEazoBridge = {
  getLaunchParams?: () => Promise<Record<string, string>>;
  getLocale?: () => Promise<string>;
  getCapabilities?: () => Promise<Partial<HostCapabilities>>;
  share?: (payload: SharePayload) => Promise<HostResult<{ shareId: string; url: string }>>;
  remix?: (payload: RemixPayload) => Promise<HostResult<{ remixId: string; launchParams: Record<string, string> }>>;
  track?: (event: TelemetryEvent) => Promise<HostResult>;
  requestResize?: (heightPx: number) => void;
};

const injectedBridge = (): InjectedEazoBridge | undefined =>
  (globalThis as typeof globalThis & { eazo?: InjectedEazoBridge }).eazo;

/** Production adapter for the capability bridge injected by the Eazo container. */
export class EazoHostAdapter extends WebFallbackAdapter {
  readonly #bridge: InjectedEazoBridge;
  constructor(bridge: InjectedEazoBridge) { super(); this.#bridge = bridge; }
  override async getLaunchParams() { return this.#bridge.getLaunchParams?.() ?? super.getLaunchParams(); }
  override async getLocale() { return this.#bridge.getLocale?.() ?? super.getLocale(); }
  override async getCapabilities(): Promise<HostCapabilities> {
    const native = await this.#bridge.getCapabilities?.() ?? {};
    return { ...defaultCapabilities, ...native, share: Boolean(this.#bridge.share ?? native.share), remix: Boolean(this.#bridge.remix ?? native.remix) };
  }
  override async share(payload: SharePayload) { return this.#bridge.share?.(payload) ?? super.share(payload); }
  override async remix(payload: RemixPayload) { return this.#bridge.remix?.(payload) ?? super.remix(payload); }
  override async track(event: TelemetryEvent) { return this.#bridge.track?.(event) ?? super.track(event); }
  override requestResize(heightPx: number) {
    if (this.#bridge.requestResize) this.#bridge.requestResize(heightPx);
    else super.requestResize(heightPx);
  }
}

export const selectHostAdapter = (): EazoHostPort => {
  const fixtureMode = new URLSearchParams(globalThis.location?.search ?? '').get('fixture') === '1';
  if (fixtureMode) return new FakeEazoAdapter();
  const bridge = injectedBridge();
  return bridge ? new EazoHostAdapter(bridge) : new WebFallbackAdapter();
};

import type { EazoHostPort, HostCapabilities, HostResult, PlanDraftV1, SharePayload } from '@eazo/contracts';
import { WebFallbackAdapter } from '@eazo/platform';

export class ProductionEazoAdapter extends WebFallbackAdapter implements EazoHostPort {
  override async getLocale() { return navigator.language || 'en-US'; }

  override async getCapabilities(): Promise<HostCapabilities> {
    return {
      aiClassification: false,
      speechTranscription: false,
      translation: false,
      cacheBundle: false,
      share: true,
      remix: false,
      resize: true,
      anonymousTelemetry: false,
    };
  }

  override async classifyDay(_payload: Parameters<EazoHostPort['classifyDay']>[0]): Promise<HostResult<PlanDraftV1>> {
    return { ok: false, code: 'UNSUPPORTED', retryable: false, messageKey: 'host.ai.unsupported' };
  }

  override async share(payload: SharePayload): Promise<HostResult<{ shareId: string; url: string }>> {
    try {
      const { share } = await import('@eazo/sdk');
      const accepted = await share.compose({
        text: `My ideal 24 hours\n\n${JSON.stringify(payload.publicData)}`,
        sourceAppId: 'ideal-day-lab',
        targetPath: '/?remix=shared',
      });
      if (!accepted.accepted) return { ok: false, code: 'UNSUPPORTED', retryable: false, messageKey: 'host.share.continue_in_eazo' };
      return { ok: true, value: { shareId: `eazo-${Date.now()}`, url: 'eazo://compose' } };
    } catch {
      return { ok: false, code: 'INTERNAL', retryable: true, messageKey: 'host.share.failed' };
    }
  }
}

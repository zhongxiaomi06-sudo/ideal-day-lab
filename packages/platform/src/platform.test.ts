import { describe, expect, it } from 'vitest';
import type { DataManifestV1 } from '@eazo/contracts';
import { AtomicContentCache } from './atomic-cache';
import { EazoHostAdapter, FakeEazoAdapter, WebFallbackAdapter } from './adapters';
import { evaluateKillSwitch, resolveFlag } from './flags';
import { validateManifestShape } from './manifest-validator';

describe('platform contracts', () => {
  it('does not switch active content when a staged file is missing', () => {
    const cache = new AtomicContentCache();
    const v1 = { version: '1', files: new Map([['fixture.json', 'v1']]) };
    cache.rollback(v1);
    cache.stage({ version: '2', files: new Map([['other.json', 'v2']]) });
    expect(cache.activate(['fixture.json'])).toBe(false);
    expect(cache.active?.version).toBe('1');
    cache.stage({ version: '2', files: new Map([['fixture.json', 'v2']]) });
    expect(cache.activate(['fixture.json'])).toBe(true);
    expect(cache.active?.version).toBe('2');
  });

  it('returns exact flag errors', () => {
    expect(resolveFlag('unknown', new Set(['known']), null, new Date('2026-08-27'))).toMatchObject({ error: 'FLAG_UNKNOWN' });
    expect(resolveFlag('known', new Set(['known']), { id: 'known', enabled: true, scope: 'build', owner: 'owner', reason: 'fixture', expiresAt: '2026-01-01' }, new Date('2026-08-27'))).toMatchObject({ error: 'FLAG_EXPIRED' });
    expect(resolveFlag('known', new Set(['known']), { id: 'other', enabled: true, scope: 'build', owner: '', reason: '', expiresAt: null }, new Date('2026-08-27'))).toMatchObject({ error: 'FLAG_CONFIG_INVALID' });
    expect(resolveFlag('known', new Set(['known']), { id: 'known', enabled: true, scope: 'build', owner: 'owner', reason: 'fixture', expiresAt: null }, new Date('2026-08-27'))).toEqual({ enabled: true, source: 'config' });
  });

  it('applies minimum-build, content and feature kill switches', () => {
    const fixture = { disabledFeatures: ['share'], disabledContentIds: ['withdrawn'], minimumSafeBuildVersion: '2.0.0', issuedAt: '2026-08-27', reasonCode: 'fixture' };
    expect(evaluateKillSwitch('1.9.0', 'other', null, fixture)).toBe('MIN_VERSION_REQUIRED');
    expect(evaluateKillSwitch('2.0.0', 'other', 'withdrawn', fixture)).toBe('CONTENT_WITHDRAWN');
    expect(evaluateKillSwitch('2.0.0', 'share', null, fixture)).toBe('CONTENT_WITHDRAWN');
    expect(evaluateKillSwitch('2.0.0', 'other', null, fixture)).toBeNull();
  });

  it('can inject every host failure without platform access', async () => {
    const adapter = new FakeEazoAdapter({ error: 'TIMEOUT' });
    const result = await adapter.classifyDay({ requestId: 'fixture-1', locale: 'en-US', text: 'Sleep, Create', schemaVersion: 1 });
    expect(result).toMatchObject({ ok: false, code: 'TIMEOUT', retryable: true });
  });

  it('provides deterministic successful fake capabilities', async () => {
    const adapter = new FakeEazoAdapter();
    const draft = await adapter.classifyDay({ requestId: 'fixture-2', locale: 'en-US', text: 'Sleep, Create, Wander', schemaVersion: 1 });
    expect(draft.ok && draft.value.blocks.reduce((sum, block) => sum + (block.durationMin ?? 0), 0)).toBe(1440);
    await expect(adapter.share({ appId: 'ideal-day-lab', schemaVersion: 1, publicData: {} })).resolves.toMatchObject({ ok: true });
    await expect(adapter.remix({ appId: 'ideal-day-lab', schemaVersion: 1, content: {}, checksum: 'fixture' })).resolves.toMatchObject({ ok: true });
    await expect(adapter.cacheBundle({ appId: 'ideal-day-lab', version: '1', urls: ['/fixture.json'], expectedBytes: 10 })).resolves.toMatchObject({ ok: true, value: { failedUrls: [] } });
    await expect(adapter.getCapabilities()).resolves.toMatchObject({ aiClassification: true, cacheBundle: true });
    expect(adapter.calls).toEqual(['classifyDay', 'share', 'remix', 'cacheBundle']);
  });

  it('keeps unsupported browser capabilities explicit', async () => {
    const adapter = new WebFallbackAdapter();
    await expect(adapter.getOptionalUserId()).resolves.toBeNull();
    await expect(adapter.classifyDay({ requestId: 'x', locale: 'en-US', text: 'x', schemaVersion: 1 })).resolves.toMatchObject({ ok: false, code: 'UNSUPPORTED' });
    await expect(adapter.transcribeAudio({ requestId: 'x', locale: 'en-US', audio: new Blob(), deleteSourceAfterTranscription: true })).resolves.toMatchObject({ code: 'UNSUPPORTED' });
    await expect(adapter.translateMessages({ locale: 'en-US', messages: {} })).resolves.toMatchObject({ code: 'UNSUPPORTED' });
    await expect(adapter.cacheBundle({ appId: 'ideal-day-lab', version: '1', urls: [], expectedBytes: 0 })).resolves.toMatchObject({ code: 'UNSUPPORTED' });
    await expect(adapter.getCacheStatus({ appId: 'ideal-day-lab', version: '1' })).resolves.toMatchObject({ code: 'UNSUPPORTED' });
    await expect(adapter.clearCache({ appId: 'ideal-day-lab' })).resolves.toMatchObject({ code: 'UNSUPPORTED' });
    await expect(adapter.share({ appId: 'ideal-day-lab', schemaVersion: 1, publicData: {} })).resolves.toMatchObject({ code: 'UNSUPPORTED' });
    await expect(adapter.remix({ appId: 'ideal-day-lab', schemaVersion: 1, content: {}, checksum: 'x' })).resolves.toMatchObject({ code: 'UNSUPPORTED' });
    await expect(adapter.track({ name: 'fixture', eventVersion: 1, anonymousSessionId: 'x', properties: {} })).resolves.toEqual({ ok: true, value: undefined });
    await expect(adapter.getCapabilities()).resolves.toMatchObject({ share: false, resize: true });
  });

  it('reports all manifest shape failures and accepts a valid manifest', () => {
    const base: DataManifestV1 = {
      manifestVersion: 1, appId: 'ideal-day-lab', buildVersion: '1', contentVersion: '1', schemaVersions: { fixture: 1 }, createdAt: '2026-08-27', rollbackBuildVersion: '0',
      files: [{ path: 'fixture.json', sha256: 'a'.repeat(64), bytes: 1, contentType: 'application/json', licenseId: 'FIXTURE-ONLY', sourceIds: ['fixture'] }], datasets: [], totalBytes: 1,
    };
    expect(validateManifestShape(base, new Set(['FIXTURE-ONLY']), new Set(['fixture.json']))).toEqual({ valid: true });
    const invalid = { ...base, rollbackBuildVersion: null, files: [base.files[0]!, { ...base.files[0]!, sha256: 'bad', licenseId: 'UNKNOWN' }] };
    const result = validateManifestShape(invalid, new Set(['FIXTURE-ONLY']), new Set());
    expect(result.valid).toBe(false);
    if (!result.valid) expect(new Set(result.errors.map((error) => error.code))).toEqual(new Set(['FILE_MISSING', 'DUPLICATE_PATH', 'HASH_MISMATCH', 'LICENSE_UNKNOWN', 'ROLLBACK_MISSING']));
  });
});

describe('EazoHostAdapter', () => {
  it('uses the injected production bridge for sharing and capabilities', async () => {
    const adapter = new EazoHostAdapter({
      getCapabilities: async () => ({ share: true }),
      share: async () => ({ ok: true, value: { shareId: 'real-1', url: 'https://eazo.example/s/real-1' } }),
    });
    await expect(adapter.getCapabilities()).resolves.toMatchObject({ share: true });
    await expect(adapter.share({ appId: 'who-shared-the-year', schemaVersion: 1, publicData: {} })).resolves.toMatchObject({ ok: true, value: { shareId: 'real-1' } });
  });
});

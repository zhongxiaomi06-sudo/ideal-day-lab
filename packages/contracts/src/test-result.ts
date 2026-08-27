export type TestStatus = 'pass' | 'fail' | 'blocked' | 'not-run';

export type TestResultV1 = {
  schemaVersion: 1;
  testId: string;
  bindingId: string;
  priority: 'P0' | 'P1' | 'P2' | 'shared';
  stageGate: 'D1' | 'D2-entry' | 'D2-exit' | 'D3' | 'D4';
  status: TestStatus;
  gitSha: string;
  artifactSha256: string;
  dataManifestSha256: string;
  environment: { id: string; details: Record<string, string> };
  runner: { name: string; version: string };
  evidence: Array<{ uri: string; sha256: string }>;
  startedAt: string;
  finishedAt: string;
};

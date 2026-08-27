import { describe, expect, test } from 'vitest';
import {
  DAY_MINUTES, classifyLocally, comparisons, planFromDraft, resizeSharedBoundary,
  resizeSingleBoundary, sanitizeForShare, validateBlocks,
} from './domain';
import type { Plan, TimeBlock } from './domain';

const adjacent: TimeBlock[] = [
  { id: 'a', title: 'A', categoryId: 'work-study', startMin: 480, endMin: 540 },
  { id: 'b', title: 'B', categoryId: 'play', startMin: 540, endMin: 600 },
];

describe('Ideal Day production contracts', () => {
  test('TEST-DAY-002 local classification produces exactly 1,440 integer minutes', () => {
    const plan = classifyLocally('sleep, make, walk, eat with friends');
    expect(plan.blocks.reduce((sum, block) => sum + block.endMin - block.startMin, 0)).toBe(DAY_MINUTES);
    expect(validateBlocks(plan.blocks)).toEqual([]);
  });

  test('TEST-DAY-003 hostile text remains inert data in local fallback', () => {
    const plan = classifyLocally('<img src=x onerror=alert(1)>, unknown activity');
    expect(plan.blocks.some((block) => block.title.includes('<img'))).toBe(true);
    expect(plan.blocks.every((block) => block.categoryId !== ('<script>' as never))).toBe(true);
  });

  test('TEST-DAY-003 rejects unknown AI fields and accepts a strict 1,440-minute draft', () => {
    expect(planFromDraft({ schemaVersion: 1, blocks: [{ title: '<img onerror=alert(1)>', categoryId: 'sleep', durationMin: 1440, html: true }] }, 'private')).toBeNull();
    const valid = planFromDraft({ schemaVersion: 1, blocks: [{ title: 'Sleep', categoryId: 'sleep', durationMin: 480 }, { title: 'Create', categoryId: 'work-study', durationMin: 960 }] }, 'private');
    expect(valid?.blocks.at(-1)?.endMin).toBe(1440);
  });

  test('TEST-DAY-004 shared boundary moves both blocks and keeps total', () => {
    const result = resizeSharedBoundary(adjacent, 0, 555, 5);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.blocks[0]?.endMin).toBe(555);
      expect(result.blocks[1]?.startMin).toBe(555);
      expect(result.blocks.reduce((sum, block) => sum + block.endMin - block.startMin, 0)).toBe(120);
    }
  });

  test('TEST-DAY-004 single boundary overlap is rejected without mutation', () => {
    const result = resizeSingleBoundary(adjacent, 0, 555);
    expect(result).toEqual({ ok: false, code: 'TIME_OVERLAP', blocks: adjacent });
    expect(adjacent[0]?.endMin).toBe(540);
  });

  test('TEST-DAY-005 comparison exposes exact 182.5 raw value and rounding', () => {
    const plan: Plan = { schemaVersion: 2, planId: 'p', title: 'P', locale: 'en-US', createdAt: '', updatedAt: '', blocks: [
      { id: 'x', title: 'Friends', categoryId: 'social', startMin: 0, endMin: 60 },
    ] };
    const dinner = comparisons(plan).find((item) => item.id === 'picnics');
    expect(dinner?.raw).toBe(182.5);
    expect(dinner?.detail).toContain('60 min/day × 365 days ÷ 120');
  });

  test('TEST-DAY-007 share snapshot excludes private source, title, notes and ids', () => {
    const plan = { ...classifyLocally('private diary text'), title: 'Private title', notes: 'Private note' };
    const exported = JSON.stringify(sanitizeForShare(plan));
    expect(exported).not.toContain('private');
    expect(exported).not.toContain(plan.planId);
    expect(exported).not.toContain(plan.blocks[0]!.id);
    expect(exported).toContain('categoryId');
  });

  test('TEST-DAY-005 comparison ledger has at least 20 usable entries', () => {
    const ids = ['sleep', 'work-study', 'care', 'commute', 'food', 'exercise', 'social', 'play', 'personal', 'unallocated'] as const;
    const blocks = ids.map((categoryId, index) => ({ id: categoryId, title: categoryId, categoryId, startMin: index * 60, endMin: index * 60 + 60 }));
    const plan: Plan = { schemaVersion: 2, planId: 'all', title: 'All', locale: 'en-US', createdAt: '', updatedAt: '', blocks };
    expect(comparisons(plan).length).toBeGreaterThanOrEqual(20);
  });
});

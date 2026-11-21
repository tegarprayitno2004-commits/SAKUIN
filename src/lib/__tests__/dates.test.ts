import { describe, expect, it } from 'vitest';
import {
  getElapsedAndRemainingDays,
  getMonthRangeJakarta,
  getPreviousEquivalentRange,
  getWeekRangeJakarta,
  jakartaDateKeyToDate,
  toJakartaDateKey,
} from '@/src/lib/dates';

describe('Asia/Jakarta date boundary utilities', () => {
  it('handles 23:30 WIB and 00:30 WIB across midnight without shifting to UTC day', () => {
    // 2026-11-20 23:30 WIB == 2026-11-20 16:30 UTC
    const lateNightWib = new Date('2026-11-20T16:30:00.000Z');
    // 2026-11-21 00:30 WIB == 2026-11-20 17:30 UTC (still Nov 20 in UTC, but Nov 21 in WIB!)
    const earlyMorningWib = new Date('2026-11-20T17:30:00.000Z');

    expect(toJakartaDateKey(lateNightWib)).toBe('2026-11-20');
    expect(toJakartaDateKey(earlyMorningWib)).toBe('2026-11-21');
  });

  it('roundtrips jakartaDateKeyToDate accurately in Asia/Jakarta', () => {
    const instant = jakartaDateKeyToDate('2026-11-20', '23:30');
    expect(toJakartaDateKey(instant)).toBe('2026-11-20');
    const nextInstant = jakartaDateKeyToDate('2026-11-21', '00:30');
    expect(toJakartaDateKey(nextInstant)).toBe('2026-11-21');
  });

  it('computes Monday-Sunday week ranges correctly', () => {
    // 2026-11-20 is a Friday
    const range = getWeekRangeJakarta('2026-11-20');
    expect(range.startDate).toBe('2026-11-16'); // Monday
    expect(range.endDate).toBe('2026-11-22'); // Sunday
  });

  it('computes 1st-last day of month ranges correctly', () => {
    const febLeap = getMonthRangeJakarta('2024-02-15');
    expect(febLeap.startDate).toBe('2024-02-01');
    expect(febLeap.endDate).toBe('2024-02-29');

    const nov = getMonthRangeJakarta('2026-11-20');
    expect(nov.startDate).toBe('2026-11-01');
    expect(nov.endDate).toBe('2026-11-30');
  });

  it('computes elapsed and remaining days cleanly', () => {
    const res = getElapsedAndRemainingDays('2026-11-16', '2026-11-22', '2026-11-20');
    expect(res.totalDays).toBe(7);
    expect(res.elapsedDays).toBe(5);
    expect(res.remainingDays).toBe(3);
  });

  it('computes previous equivalent range of identical length', () => {
    const prev = getPreviousEquivalentRange('2026-11-16', '2026-11-22');
    expect(prev.startDate).toBe('2026-11-09');
    expect(prev.endDate).toBe('2026-11-15');
  });
});

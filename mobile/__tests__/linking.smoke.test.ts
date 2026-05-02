// Smoke test: deep link parser (mobile/src/lib/linking.ts).
//
// Asserts: correct parsing of valid URLs, unknown hubId → undefined,
// unknown reasons filtered out, URL with no reasons param.

import { parseUrl, buildUrl } from '../src/lib/linking';

describe('parseUrl — valid deep links', () => {
  it('parses dtp://hub/seattle?reasons=hike,lake correctly', () => {
    const result = parseUrl('dtp://hub/seattle?reasons=hike,lake');
    // dtp://hub/seattle?reasons=hike,lake → expect { hubId: 'seattle', reasons: ['hike', 'lake'] }
    expect(result.hubId).toBe('seattle');
    expect(result.reasons).toEqual(expect.arrayContaining(['hike', 'lake']));
    expect(result.reasons).toHaveLength(2);
  });

  it('parses URL with a single reason', () => {
    const result = parseUrl('dtp://hub/austin?reasons=hike');
    expect(result.hubId).toBe('austin');
    expect(result.reasons).toEqual(['hike']);
  });

  it('parses URL with no reasons param — hubId only', () => {
    const result = parseUrl('dtp://hub/denver');
    expect(result.hubId).toBe('denver');
    expect(result.reasons).toBeUndefined();
  });

  it('parses all known hubs', () => {
    for (const hubId of ['seattle', 'austin', 'bay-area', 'nyc', 'denver', 'la', 'boston']) {
      const result = parseUrl(`dtp://hub/${hubId}`);
      expect(result.hubId).toBe(hubId);
    }
  });
});

describe('parseUrl — unknown / invalid inputs', () => {
  it('returns empty object for unknown hubId', () => {
    const result = parseUrl('dtp://hub/atlantis');
    // Unknown hubId → hubId should be undefined (dropped).
    expect(result.hubId).toBeUndefined();
  });

  it('filters out unknown reasons', () => {
    const result = parseUrl('dtp://hub/seattle?reasons=hike,notavalidreason,lake');
    expect(result.hubId).toBe('seattle');
    // 'notavalidreason' must be dropped; only hike + lake remain.
    expect(result.reasons).toEqual(expect.arrayContaining(['hike', 'lake']));
    expect(result.reasons).not.toContain('notavalidreason');
  });

  it('returns empty object for wrong scheme', () => {
    const result = parseUrl('https://hub/seattle?reasons=hike');
    expect(result.hubId).toBeUndefined();
  });

  it('returns empty object for wrong host', () => {
    const result = parseUrl('dtp://open/seattle?reasons=hike');
    expect(result.hubId).toBeUndefined();
  });

  it('returns empty object for malformed URL', () => {
    const result = parseUrl('not a url at all');
    expect(result).toEqual({});
  });

  it('drops reasons list entirely when all values are unknown', () => {
    const result = parseUrl('dtp://hub/seattle?reasons=foo,bar');
    expect(result.hubId).toBe('seattle');
    // All reasons unknown → reasons should be absent.
    expect(result.reasons).toBeUndefined();
  });
});

describe('buildUrl', () => {
  it('builds a URL with reasons', () => {
    const url = buildUrl({ hubId: 'seattle', reasons: ['hike', 'lake'] });
    expect(url).toBe('dtp://hub/seattle?reasons=hike,lake');
  });

  it('builds a URL without reasons when array is empty', () => {
    const url = buildUrl({ hubId: 'austin', reasons: [] });
    expect(url).toBe('dtp://hub/austin');
  });

  it('builds a URL without reasons when reasons is omitted', () => {
    const url = buildUrl({ hubId: 'denver' });
    expect(url).toBe('dtp://hub/denver');
  });

  it('round-trips through parseUrl + buildUrl', () => {
    const original = 'dtp://hub/seattle?reasons=hike,lake';
    const parsed = parseUrl(original);
    const rebuilt = buildUrl(parsed);
    // dtp://hub/seattle?reasons=hike,lake → expect round-trip to equal original
    expect(rebuilt).toBe(original);
  });
});

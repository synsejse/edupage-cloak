import { describe, expect, test } from 'bun:test';

import { BLOCKED_EVENTS } from '../src/scripts/blocked-events';
import { sha256Hex } from '../src/scripts/checksum';
import { CONFIG } from '../src/scripts/config';

const ETEST_URLS = [
  'https://soselh.edupage.org/elearning/pics/js/etest/etestPlayer.js',
  'https://www.ibobor-online.sk/elearning/pics/js/etest/etestPlayer.js',
];
const TRACKED_NAMESPACE_RE = /\.etest(?:player|playeral|aplayer)\b/;

function extractTrackedJQueryOnEvents(source: string): string[] {
  const events = new Set<string>();
  const onCallPattern = /\.on\(\s*(['"])(.*?)\1/g;

  for (const match of source.matchAll(onCallPattern)) {
    const eventExpression = match[2];

    for (const eventName of eventExpression.split(/\s+/)) {
      if (TRACKED_NAMESPACE_RE.test(eventName)) {
        events.add(eventName);
      }
    }
  }

  return [...events].sort();
}

async function fetchPlayerSource(url: string): Promise<string> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch ${url}: ${response.status} ${response.statusText}`
    );
  }

  return response.text();
}

describe('etestPlayer compatibility', () => {
  test('live etestPlayer checksum matches the configured known checksum', async () => {
    for (const url of ETEST_URLS) {
      const source = await fetchPlayerSource(url);
      const checksum = await sha256Hex(source);
      expect(checksum).toBe(CONFIG.KNOWN_ETEST_PLAYER_CHECKSUM);
    }
  });

  test('blocked event list matches tracked jQuery .on() registrations', async () => {
    for (const url of ETEST_URLS) {
      const source = await fetchPlayerSource(url);
      const registeredEvents = extractTrackedJQueryOnEvents(source);
      const blockedEvents = new Set(BLOCKED_EVENTS);

      expect(registeredEvents.length).toBeGreaterThan(0);

      const unblockedEvents = registeredEvents.filter(
        (eventName) => !blockedEvents.has(eventName)
      );

      expect(unblockedEvents).toEqual([]);
    }
  });
});

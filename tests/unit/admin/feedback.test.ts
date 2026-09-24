import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  FeedbackContextLine,
  FeedbackEntry,
  FeedbackText,
} from '@/components/admin/feedback/FeedbackEntry';
import {
  adjustNewCount,
  FEEDBACK_AREA_LABELS,
  FEEDBACK_AREA_ORDER,
  FEEDBACK_KIND_LABELS,
  FEEDBACK_KIND_ORDER,
  feedbackAuthorName,
  formatAppVersion,
  formatPlatform,
  truncateUpdateId,
} from '@/lib/admin/feedback';
import {
  FeedbackArea,
  FeedbackKind,
  FeedbackStatus,
  type AdminFeedbackItem,
} from '@/lib/admin/types';

/**
 * The Feedback inbox (poolmobile #720).
 *
 * ⚠️ The load-bearing tests here are the XSS ones: `text` and every `context`
 * field are strings a phone sent, and the page must render them as TEXT. If
 * someone swaps a text child for `dangerouslySetInnerHTML` (or a markdown
 * renderer), the `<img` below appears unescaped in the markup and these fail.
 */

const XSS = '<img src=x onerror=alert(1)>';

function item(over: Partial<AdminFeedbackItem> = {}): AdminFeedbackItem {
  return {
    id: '00000000-0000-4000-8000-0000000000f1',
    userId: '00000000-0000-4000-8000-0000000000a1',
    userDisplayName: 'Dana Reyes',
    userHandle: 'dana',
    area: FeedbackArea.SettleUp,
    kind: FeedbackKind.Broken,
    status: FeedbackStatus.New,
    text: 'The settle button did nothing.',
    context: {
      platform: 'ios',
      appVersion: '1.0.3',
      buildNumber: '42',
      updateId: '0f8e1c2a-7b9d-4e3f-a1b2-c3d4e5f60718',
      osVersion: '18.2',
      locale: 'en',
      screen: 'SettleUp',
    },
    createdAt: '2026-09-24T10:00:00.000Z',
    statusChangedAt: null,
    statusChangedById: null,
    ...over,
  };
}

const renderEntry = (i: AdminFeedbackItem) =>
  renderToStaticMarkup(
    createElement(FeedbackEntry, { item: i, pending: false, onChangeStatus: () => undefined }),
  );

describe('feedback text is rendered as TEXT, never HTML', () => {
  it('escapes an <img onerror> payload in the text', () => {
    const html = renderToStaticMarkup(createElement(FeedbackText, { text: XSS }));
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).not.toContain('<img');
  });

  it('escapes the payload in the full row, too', () => {
    const html = renderEntry(item({ text: XSS }));
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).not.toContain('<img');
  });

  it('escapes every context field and never turns one into a link', () => {
    const html = renderEntry(
      item({
        text: null,
        userDisplayName: XSS,
        userHandle: XSS,
        context: {
          platform: 'web',
          appVersion: XSS,
          buildNumber: XSS,
          updateId: XSS,
          runtimeVersion: XSS,
          osVersion: XSS,
          locale: XSS,
          screen: 'javascript:alert(1)',
        },
      }),
    );
    expect(html).not.toContain('<img');
    // The one link is the internal user route, built from the server id.
    const hrefs = [...html.matchAll(/href="([^"]*)"/g)].map((m) => m[1]);
    expect(hrefs).toEqual(['/admin/users/00000000-0000-4000-8000-0000000000a1']);
    expect(html).not.toContain('dangerouslySetInnerHTML');
  });

  it('keeps line breaks with pre-wrap rather than converting them to markup', () => {
    const html = renderToStaticMarkup(createElement(FeedbackText, { text: 'one\ntwo' }));
    expect(html).toContain('whitespace-pre-wrap');
    expect(html).toContain('one\ntwo');
    expect(html).not.toContain('<br');
  });

  it('shows a muted "No text" for null and blank text', () => {
    for (const text of [null, '   ']) {
      const html = renderToStaticMarkup(createElement(FeedbackText, { text }));
      expect(html).toContain('No text');
      expect(html).toContain('text-muted-foreground');
    }
  });
});

describe('context line', () => {
  it('shows platform + OS, version (build), truncated OTA id with the full id in title, locale, screen', () => {
    const ctx = item().context;
    const html = renderToStaticMarkup(createElement(FeedbackContextLine, { context: ctx }));
    expect(html).toContain('iOS 18.2');
    expect(html).toContain('v1.0.3 (42)');
    expect(html).toContain(`title="${ctx.updateId}"`);
    expect(html).toContain('0f8e1c2a…');
    expect(html).toContain('>en<');
    expect(html).toContain('SettleUp');
  });

  it('degrades field by field when the app sent less', () => {
    expect(formatPlatform({ platform: 'android' })).toBe('Android');
    expect(formatAppVersion({ platform: 'android' })).toBeNull();
    expect(formatAppVersion({ platform: 'android', buildNumber: '7' })).toBe('build 7');
    expect(formatAppVersion({ platform: 'android', appVersion: '2.0' })).toBe('v2.0');
    expect(truncateUpdateId('short')).toBe('short');
  });
});

describe('labels and counts', () => {
  it('labels every area and kind with the app’s own words', () => {
    expect(FEEDBACK_AREA_ORDER).toHaveLength(Object.values(FeedbackArea).length);
    expect(FEEDBACK_KIND_ORDER).toHaveLength(Object.values(FeedbackKind).length);
    expect(FEEDBACK_AREA_LABELS[FeedbackArea.ProfileSettings]).toBe('Profile & settings');
    expect(FEEDBACK_AREA_LABELS[FeedbackArea.Other]).toBe('Something else');
    expect(FEEDBACK_KIND_LABELS[FeedbackKind.MissingFeature]).toBe('Missing a feature');
  });

  it('names the author by display name, then handle, then a stated absence', () => {
    expect(feedbackAuthorName(item())).toBe('Dana Reyes');
    expect(feedbackAuthorName(item({ userDisplayName: null }))).toBe('@dana');
    expect(feedbackAuthorName(item({ userDisplayName: null, userHandle: null }))).toBe(
      'Deleted account',
    );
  });

  it('adjusts the NEW count only on moves into or out of New', () => {
    expect(adjustNewCount(3, FeedbackStatus.New, FeedbackStatus.Triaged)).toBe(2);
    expect(adjustNewCount(3, FeedbackStatus.Fixed, FeedbackStatus.New)).toBe(4);
    expect(adjustNewCount(3, FeedbackStatus.Triaged, FeedbackStatus.Fixed)).toBe(3);
    expect(adjustNewCount(3, FeedbackStatus.New, FeedbackStatus.New)).toBe(3);
    expect(adjustNewCount(0, FeedbackStatus.New, FeedbackStatus.Fixed)).toBe(0);
  });

  it('marks the current status pressed and disabled in the row control', () => {
    const html = renderEntry(item({ status: FeedbackStatus.Triaged }));
    expect(html).toMatch(/aria-pressed="true"[^>]*>Triaged</);
    expect(html).toMatch(/aria-pressed="false"[^>]*>New</);
  });
});

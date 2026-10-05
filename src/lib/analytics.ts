// Anonymous usage analytics. Never send: participant name, answers, report details.
import { track as vercelTrack } from '@vercel/analytics';

export type AnalyticsEvent =
  | 'simulation_started'
  | 'simulation_completed'
  | 'test_mode_quick'
  | 'test_mode_standard'
  | 'test_mode_full'
  | 'pdf_downloaded'
  | 'leaderboard_opt_in'
  | 'country_compared'
  | 'language_changed'
  | 'page_view';

export function trackEvent(event: AnalyticsEvent, props?: Record<string, string | number>) {
  try {
    vercelTrack(event, props);
  } catch {
    /* analytics must never break the app */
  }
}

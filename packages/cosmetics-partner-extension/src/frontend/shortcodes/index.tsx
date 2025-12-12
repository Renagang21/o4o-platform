/**
 * Cosmetics Partner Extension Shortcodes
 *
 * Frontend shortcode components for partner features
 */

import React from 'react';

/**
 * [partner_profile] - Display partner profile widget
 */
export function PartnerProfileShortcode() {
  return (
    <div className="partner-profile-widget">
      <h3>Partner Profile</h3>
      <p>Partner profile information will be displayed here</p>
    </div>
  );
}

/**
 * [partner_links] - Display partner links widget
 */
export function PartnerLinksShortcode() {
  return (
    <div className="partner-links-widget">
      <h3>My Partner Links</h3>
      <p>Partner links will be displayed here</p>
    </div>
  );
}

/**
 * [partner_routine id="xxx"] - Display a specific routine
 */
export function PartnerRoutineShortcode({ id }: { id?: string }) {
  return (
    <div className="partner-routine-widget">
      <h3>Partner Routine</h3>
      <p>Routine {id || 'N/A'} will be displayed here</p>
    </div>
  );
}

/**
 * [partner_earnings] - Display earnings summary widget
 */
export function PartnerEarningsShortcode() {
  return (
    <div className="partner-earnings-widget">
      <h3>Earnings Summary</h3>
      <div className="earnings-stats">
        <div className="stat">
          <span>Total Earnings</span>
          <strong>$0.00</strong>
        </div>
        <div className="stat">
          <span>Available Balance</span>
          <strong>$0.00</strong>
        </div>
      </div>
    </div>
  );
}

export default {
  partner_profile: PartnerProfileShortcode,
  partner_links: PartnerLinksShortcode,
  partner_routine: PartnerRoutineShortcode,
  partner_earnings: PartnerEarningsShortcode,
};

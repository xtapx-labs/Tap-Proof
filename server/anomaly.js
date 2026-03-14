// ─────────────────────────────────────────────
// XtapX Anomaly Detection Engine
// ─────────────────────────────────────────────
// Detects patterns of physical misinformation:
//   - Geographic impossibility
//   - Counter regression (clone detection)
//   - Velocity anomaly (probing)
//   - Post-transfer activity
// ─────────────────────────────────────────────

// ─── Counter Analysis ───────────────────────
function analyzeCounter(newCounter, lastRecordedCounter) {
  if (lastRecordedCounter === null || lastRecordedCounter === undefined) {
    return { status: 'normal', detail: 'first_scan' };
  }

  const diff = newCounter - lastRecordedCounter;

  if (diff === 0) {
    return { status: 'replay', detail: 'counter_unchanged_replay_attempt' };
  }

  if (diff < 0) {
    return { status: 'clone', detail: 'counter_regression_impossible_on_genuine_hardware' };
  }

  if (diff === 1) {
    return { status: 'normal', detail: 'sequential_scan' };
  }

  if (diff <= 5) {
    return { status: 'normal', detail: 'small_gap_likely_unrecorded_scans' };
  }

  if (diff <= 50) {
    return { status: 'suspicious', detail: `counter_gap_of_${diff}_unrecorded_scans` };
  }

  return { status: 'suspicious', detail: `large_counter_gap_of_${diff}_possible_abuse` };
}

// ─── Velocity Analysis ──────────────────────
// Checks if scans are happening too fast (probing / harvesting)
function analyzeVelocity(recentScans) {
  if (!recentScans || recentScans.length < 3) {
    return { status: 'normal', detail: 'insufficient_data' };
  }

  // Check scans in last 10 minutes
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const recentBurst = recentScans.filter(s => s.scanned_at > tenMinutesAgo);

  if (recentBurst.length >= 20) {
    return { status: 'suspicious', detail: `${recentBurst.length}_scans_in_10_minutes_possible_probing` };
  }

  if (recentBurst.length >= 10) {
    return { status: 'suspicious', detail: `${recentBurst.length}_scans_in_10_minutes_elevated_activity` };
  }

  return { status: 'normal', detail: 'normal_scan_frequency' };
}

// ─── Geographic Analysis ────────────────────
// Detects physically impossible location changes
function analyzeGeography(currentIP, lastScan) {
  // In a production system, we'd geolocate the IPs and calculate
  // travel time vs elapsed time. Here, we flag if IPs differ
  // significantly within a short window.
  if (!lastScan || !lastScan.ip_address || !currentIP) {
    return { status: 'normal', detail: 'no_geographic_data' };
  }

  if (lastScan.ip_address === currentIP) {
    return { status: 'normal', detail: 'same_location' };
  }

  const elapsed = Date.now() - new Date(lastScan.scanned_at).getTime();
  const minutesElapsed = elapsed / (1000 * 60);

  // Different IP within 5 minutes is suspicious
  if (minutesElapsed < 5) {
    return {
      status: 'suspicious',
      detail: `different_network_${Math.round(minutesElapsed)}min_apart_possible_clone`,
    };
  }

  return { status: 'normal', detail: 'location_change_within_plausible_timeframe' };
}

// ─── Post-Transfer Activity ─────────────────
// Detects scanning from previous owner's context after transfer
function analyzePostTransfer(tagUid, currentIP, ownershipHistory, recentScans) {
  if (!ownershipHistory || ownershipHistory.length < 2) {
    return { status: 'normal', detail: 'no_transfer_history' };
  }

  // Find the most recent transfer
  const lastTransfer = ownershipHistory[ownershipHistory.length - 1];
  const prevOwnerEntry = ownershipHistory[ownershipHistory.length - 2];

  if (!lastTransfer.claimed_at) {
    return { status: 'normal', detail: 'no_completed_transfer' };
  }

  // Check if scans from different IPs occurred after the transfer
  const postTransferScans = recentScans.filter(
    s => new Date(s.scanned_at) > new Date(lastTransfer.claimed_at)
  );

  const uniqueIPs = [...new Set(postTransferScans.map(s => s.ip_address).filter(Boolean))];

  if (uniqueIPs.length >= 3) {
    return {
      status: 'suspicious',
      detail: 'multiple_locations_scanning_post_transfer',
    };
  }

  return { status: 'normal', detail: 'normal_post_transfer_activity' };
}

// ─── Full Anomaly Report ────────────────────
function generateAnomalyReport(newCounter, lastCounter, recentScans, currentIP, lastScan, ownershipHistory, tagUid) {
  const counter    = analyzeCounter(newCounter, lastCounter);
  const velocity   = analyzeVelocity(recentScans);
  const geography  = analyzeGeography(currentIP, lastScan);
  const postXfer   = analyzePostTransfer(tagUid, currentIP, ownershipHistory, recentScans);

  const anomalies = [counter, velocity, geography, postXfer].filter(a => a.status !== 'normal');
  const hasSuspicious = anomalies.some(a => a.status === 'suspicious');
  const hasClone = anomalies.some(a => a.status === 'clone');
  const hasReplay = anomalies.some(a => a.status === 'replay');

  let overallStatus = 'normal';
  if (hasClone)           overallStatus = 'clone';
  else if (hasReplay)     overallStatus = 'replay';
  else if (hasSuspicious) overallStatus = 'suspicious';

  return {
    overallStatus,
    counter,
    velocity,
    geography,
    postTransfer: postXfer,
    anomalyCount: anomalies.length,
    flags: anomalies.map(a => a.detail),
  };
}

module.exports = {
  analyzeCounter,
  analyzeVelocity,
  analyzeGeography,
  analyzePostTransfer,
  generateAnomalyReport,
};

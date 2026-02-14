// ─────────────────────────────────────────────
// XtapX Verify Route — The Asset Literacy Moment
// ─────────────────────────────────────────────
// GET /verify?d={encrypted_data}&m={cmac}
//
// This is the URL the NFC tag points to.
// The phone reads it, browser opens it, server validates.
// ─────────────────────────────────────────────
const express  = require('express');
const router   = express.Router();
const supabase = require('../db');
const { decryptPICCData, verifyCMAC, decryptKeyFromStorage } = require('../crypto');
const { generateAnomalyReport } = require('../anomaly');

router.get('/', async (req, res) => {
  const { d: encryptedHex, m: cmacHex } = req.query;
  const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  // ── Step 0: Validate parameters ───────────
  if (!encryptedHex || !cmacHex) {
    return res.redirect(`/scan?result=error&reason=missing_parameters`);
  }

  try {
    // ── Step 1: Find the tag by trying to decrypt with known keys ──
    // First, try to identify the UID from the encrypted data
    // We need to iterate registered tags and attempt decryption
    const { data: tags, error: tagsError } = await supabase
      .from('tags')
      .select('uid, secret_key_enc, cmac_key_enc, last_counter, total_scans, product_name, product_brand, product_image, product_sku, current_owner, registered_at, status')
      .eq('status', 'active')
      .limit(500);

    if (tagsError) throw tagsError;

    let matchedTag = null;
    let decryptedData = null;

    for (const tag of (tags || [])) {
      const piccKey = decryptKeyFromStorage(tag.secret_key_enc);
      const result  = decryptPICCData(encryptedHex, piccKey);

      if (result.valid && result.uid === tag.uid) {
        matchedTag = tag;
        decryptedData = result;
        break;
      }
    }

    // ── Step 2: No match = counterfeit ──────
    if (!matchedTag || !decryptedData) {
      // Log the failed attempt
      await supabase.from('scans').insert({
        tag_uid:       'UNKNOWN',
        counter_value: 0,
        result:        'counterfeit',
        result_reason: 'unknown_tag_or_invalid_key',
        ip_address:    clientIP,
        scanned_at:    new Date().toISOString(),
      });

      return res.redirect(`/scan?result=counterfeit&reason=unknown_tag`);
    }

    // ── Step 3: Verify CMAC signature ───────
    const cmacKey  = decryptKeyFromStorage(matchedTag.cmac_key_enc);
    const cmacValid = verifyCMAC(cmacHex, cmacKey, decryptedData.uid, decryptedData.counter, encryptedHex);

    if (!cmacValid) {
      await supabase.from('scans').insert({
        tag_uid:       matchedTag.uid,
        counter_value: decryptedData.counter,
        result:        'counterfeit',
        result_reason: 'invalid_cmac_signature',
        ip_address:    clientIP,
        scanned_at:    new Date().toISOString(),
      });

      return res.redirect(`/scan?result=counterfeit&reason=invalid_signature&uid=${matchedTag.uid}`);
    }

    // ── Step 4: Anomaly detection ───────────
    const { data: recentScans } = await supabase
      .from('scans')
      .select('*')
      .eq('tag_uid', matchedTag.uid)
      .order('scanned_at', { ascending: false })
      .limit(50);

    const { data: ownership } = await supabase
      .from('owners')
      .select('*')
      .eq('tag_uid', matchedTag.uid)
      .order('claimed_at', { ascending: true });

    const lastScan = recentScans && recentScans.length > 0 ? recentScans[0] : null;

    const anomalyReport = generateAnomalyReport(
      decryptedData.counter,
      matchedTag.last_counter,
      recentScans || [],
      clientIP,
      lastScan,
      ownership || [],
      matchedTag.uid
    );

    // ── Step 5: Determine final result ──────
    let result = 'authentic';
    let reason = 'valid';

    if (anomalyReport.overallStatus === 'clone') {
      result = 'counterfeit';
      reason = 'counter_regression_clone_detected';
    } else if (anomalyReport.overallStatus === 'replay') {
      result = 'counterfeit';
      reason = 'replay_attempt_stale_counter';
    } else if (anomalyReport.overallStatus === 'suspicious') {
      result = 'suspicious';
      reason = anomalyReport.flags.join('; ');
    }

    // ── Step 6: Log the scan ────────────────
    const newTotalScans = (matchedTag.total_scans || 0) + 1;

    await supabase.from('scans').insert({
      tag_uid:       matchedTag.uid,
      counter_value: decryptedData.counter,
      result,
      result_reason: reason,
      ip_address:    clientIP,
      scanned_at:    new Date().toISOString(),
    });

    // ── Step 7: Update tag record ───────────
    if (result !== 'counterfeit') {
      await supabase
        .from('tags')
        .update({
          last_counter: decryptedData.counter,
          total_scans: newTotalScans,
          status: result === 'suspicious' ? 'flagged' : 'active',
        })
        .eq('uid', matchedTag.uid);
    }

    // ── Step 8: Redirect to frontend with result ──
    const params = new URLSearchParams({
      result,
      reason,
      uid:   matchedTag.uid,
    });

    return res.redirect(`/scan?${params.toString()}`);

  } catch (err) {
    console.error('Verification error:', err);
    return res.redirect(`/scan?result=error&reason=server_error`);
  }
});

// ── API endpoint (JSON response for programmatic access) ──
router.get('/api', async (req, res) => {
  const { d: encryptedHex, m: cmacHex } = req.query;
  const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  if (!encryptedHex || !cmacHex) {
    return res.status(400).json({ authentic: false, reason: 'missing_parameters' });
  }

  try {
    const { data: tags, error: tagsError } = await supabase
      .from('tags')
      .select('*')
      .eq('status', 'active')
      .limit(500);

    if (tagsError) throw tagsError;

    let matchedTag = null;
    let decryptedData = null;

    for (const tag of (tags || [])) {
      const piccKey = decryptKeyFromStorage(tag.secret_key_enc);
      const result  = decryptPICCData(encryptedHex, piccKey);
      if (result.valid && result.uid === tag.uid) {
        matchedTag = tag;
        decryptedData = result;
        break;
      }
    }

    if (!matchedTag || !decryptedData) {
      return res.json({ authentic: false, reason: 'unknown_tag', product: null });
    }

    const cmacKey   = decryptKeyFromStorage(matchedTag.cmac_key_enc);
    const cmacValid = verifyCMAC(cmacHex, cmacKey, decryptedData.uid, decryptedData.counter, encryptedHex);

    if (!cmacValid) {
      return res.json({ authentic: false, reason: 'invalid_signature', product: null });
    }

    // Fetch scans + ownership for anomaly + provenance
    const { data: recentScans } = await supabase
      .from('scans')
      .select('*')
      .eq('tag_uid', matchedTag.uid)
      .order('scanned_at', { ascending: false })
      .limit(50);

    const { data: ownership } = await supabase
      .from('owners')
      .select('*')
      .eq('tag_uid', matchedTag.uid)
      .order('claimed_at', { ascending: true });

    const lastScan = recentScans && recentScans.length > 0 ? recentScans[0] : null;

    const anomalyReport = generateAnomalyReport(
      decryptedData.counter, matchedTag.last_counter,
      recentScans || [], clientIP, lastScan,
      ownership || [], matchedTag.uid
    );

    let result = 'authentic';
    let reason = 'valid';

    if (anomalyReport.overallStatus === 'clone') {
      result = 'counterfeit'; reason = 'counter_regression_clone_detected';
    } else if (anomalyReport.overallStatus === 'replay') {
      result = 'counterfeit'; reason = 'replay_attempt_stale_counter';
    } else if (anomalyReport.overallStatus === 'suspicious') {
      result = 'suspicious'; reason = anomalyReport.flags.join('; ');
    }

    const newTotalScans = (matchedTag.total_scans || 0) + 1;

    await supabase.from('scans').insert({
      tag_uid: matchedTag.uid, counter_value: decryptedData.counter,
      result, result_reason: reason, ip_address: clientIP,
      scanned_at: new Date().toISOString(),
    });

    if (result !== 'counterfeit') {
      await supabase.from('tags').update({
        last_counter: decryptedData.counter, total_scans: newTotalScans,
        status: result === 'suspicious' ? 'flagged' : 'active',
      }).eq('uid', matchedTag.uid);
    }

    // Build provenance chain
    const provenance = (ownership || []).map(o => ({
      owner:   o.owner_email,
      action:  o.transfer_type === 'initial_claim' ? 'claimed' : 'transferred',
      date:    o.claimed_at,
      counter: o.counter_at_claim,
    }));

    // Prepend registration event
    provenance.unshift({
      owner:  matchedTag.registered_by || matchedTag.product_brand,
      action: 'registered',
      date:   matchedTag.registered_at,
      counter: 0,
    });

    return res.json({
      authentic: result === 'authentic' || result === 'suspicious',
      result,
      reason,
      product: {
        name:  matchedTag.product_name,
        brand: matchedTag.product_brand,
        image: matchedTag.product_image,
        sku:   matchedTag.product_sku,
      },
      scan_number:    newTotalScans,
      counter:        decryptedData.counter,
      last_counter:   matchedTag.last_counter,
      current_owner:  matchedTag.current_owner,
      provenance,
      anomaly:        anomalyReport,
      first_registered: matchedTag.registered_at,
      uid:            matchedTag.uid,
    });

  } catch (err) {
    console.error('Verify API error:', err);
    return res.status(500).json({ authentic: false, reason: 'server_error' });
  }
});

// ── Lightweight lookup by UID (for frontend after redirect) ──
router.get('/lookup/:uid', async (req, res) => {
  try {
    const { uid } = req.params;

    const { data: tag, error } = await supabase
      .from('tags')
      .select('*')
      .eq('uid', uid)
      .single();

    if (error || !tag) {
      return res.status(404).json({ error: 'tag_not_found' });
    }

    const { data: scans } = await supabase
      .from('scans')
      .select('*')
      .eq('tag_uid', uid)
      .order('scanned_at', { ascending: false })
      .limit(20);

    const { data: ownership } = await supabase
      .from('owners')
      .select('*')
      .eq('tag_uid', uid)
      .order('claimed_at', { ascending: true });

    const provenance = (ownership || []).map(o => ({
      owner:   o.owner_email,
      action:  o.transfer_type === 'initial_claim' ? 'claimed' : 'transferred',
      date:    o.claimed_at,
      counter: o.counter_at_claim,
    }));

    provenance.unshift({
      owner:   tag.registered_by || tag.product_brand,
      action:  'registered',
      date:    tag.registered_at,
      counter: 0,
    });

    return res.json({
      product: {
        name:  tag.product_name,
        brand: tag.product_brand,
        image: tag.product_image,
        sku:   tag.product_sku,
      },
      total_scans:     tag.total_scans,
      last_counter:    tag.last_counter,
      current_owner:   tag.current_owner,
      registered_at:   tag.registered_at,
      status:          tag.status,
      provenance,
      recent_scans:    (scans || []).map(s => ({
        counter:  s.counter_value,
        result:   s.result,
        reason:   s.result_reason,
        time:     s.scanned_at,
      })),
    });
  } catch (err) {
    console.error('Lookup error:', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

module.exports = router;

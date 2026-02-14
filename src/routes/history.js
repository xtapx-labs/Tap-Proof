// ─────────────────────────────────────────────
// XtapX History Route — Provenance & Scan Ledger
// ─────────────────────────────────────────────
// GET /api/history/:uid — Full product history
// ─────────────────────────────────────────────
const express  = require('express');
const router   = express.Router();
const supabase = require('../db');

router.get('/history/:uid', async (req, res) => {
  try {
    const uid = req.params.uid.toUpperCase();

    // ── Get tag info ────────────────────────
    const { data: tag, error: tagError } = await supabase
      .from('tags')
      .select('*')
      .eq('uid', uid)
      .single();

    if (tagError || !tag) {
      return res.status(404).json({ error: 'tag_not_found' });
    }

    // ── Get full scan ledger ────────────────
    const { data: scans, error: scanError } = await supabase
      .from('scans')
      .select('*')
      .eq('tag_uid', uid)
      .order('scanned_at', { ascending: true });

    if (scanError) throw scanError;

    // ── Get ownership chain ─────────────────
    const { data: owners, error: ownerError } = await supabase
      .from('owners')
      .select('*')
      .eq('tag_uid', uid)
      .order('claimed_at', { ascending: true });

    if (ownerError) throw ownerError;

    // ── Build provenance timeline ───────────
    const provenance = [];

    // Registration event
    provenance.push({
      type:    'registered',
      actor:   tag.registered_by || tag.product_brand,
      date:    tag.registered_at,
      counter: 0,
    });

    // Ownership events
    for (const owner of (owners || [])) {
      provenance.push({
        type:    owner.transfer_type === 'initial_claim' ? 'claimed' : 'transferred',
        actor:   owner.owner_email,
        date:    owner.claimed_at,
        counter: owner.counter_at_claim,
      });

      if (owner.released_at) {
        provenance.push({
          type:    'released',
          actor:   owner.owner_email,
          date:    owner.released_at,
          counter: owner.counter_at_claim,
        });
      }
    }

    // Sort by date
    provenance.sort((a, b) => new Date(a.date) - new Date(b.date));

    // ── Stats ───────────────────────────────
    const authenticScans = (scans || []).filter(s => s.result === 'authentic').length;
    const suspiciousScans = (scans || []).filter(s => s.result === 'suspicious').length;
    const counterfeitScans = (scans || []).filter(s => s.result === 'counterfeit').length;

    return res.json({
      product: {
        name:  tag.product_name,
        brand: tag.product_brand,
        image: tag.product_image,
        sku:   tag.product_sku,
      },
      uid:           tag.uid,
      status:        tag.status,
      current_owner: tag.current_owner,
      registered_at: tag.registered_at,
      registered_by: tag.registered_by,
      total_scans:   tag.total_scans,
      last_counter:  tag.last_counter,
      stats: {
        authentic:   authenticScans,
        suspicious:  suspiciousScans,
        counterfeit: counterfeitScans,
        total:       (scans || []).length,
      },
      provenance,
      scan_ledger: (scans || []).map(s => ({
        counter:  s.counter_value,
        result:   s.result,
        reason:   s.result_reason,
        time:     s.scanned_at,
        ip:       s.ip_address,
      })),
    });

  } catch (err) {
    console.error('History error:', err);
    return res.status(500).json({ error: 'fetch_failed' });
  }
});

module.exports = router;

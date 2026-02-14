// ─────────────────────────────────────────────
// XtapX Claim Route — First Ownership
// ─────────────────────────────────────────────
// POST /api/claim — Claim first ownership of a verified product
// ─────────────────────────────────────────────
const express  = require('express');
const router   = express.Router();
const supabase = require('../db');

router.post('/claim', async (req, res) => {
  try {
    const { tag_uid, email } = req.body;

    if (!tag_uid || !email) {
      return res.status(400).json({ error: 'tag_uid and email are required' });
    }

    const uid = tag_uid.toUpperCase();

    // ── Verify the tag exists ───────────────
    const { data: tag, error: tagError } = await supabase
      .from('tags')
      .select('*')
      .eq('uid', uid)
      .single();

    if (tagError || !tag) {
      return res.status(404).json({ error: 'tag_not_found' });
    }

    // ── Check if already owned ──────────────
    if (tag.current_owner) {
      return res.status(409).json({
        error: 'already_owned',
        current_owner: tag.current_owner,
        message: 'This product already has an owner. Use the transfer flow instead.',
      });
    }

    // ── Check the tag has been scanned at least once (verified) ──
    if (tag.total_scans < 1) {
      return res.status(400).json({
        error: 'not_yet_verified',
        message: 'Scan the product first to verify authenticity before claiming.',
      });
    }

    // ── Record ownership claim ──────────────
    const { error: ownerError } = await supabase.from('owners').insert({
      tag_uid:          uid,
      owner_email:      email.toLowerCase(),
      claimed_at:       new Date().toISOString(),
      counter_at_claim: tag.last_counter,
      released_at:      null,
      transfer_type:    'initial_claim',
    });

    if (ownerError) throw ownerError;

    // ── Update tag's current owner ──────────
    const { error: updateError } = await supabase
      .from('tags')
      .update({ current_owner: email.toLowerCase() })
      .eq('uid', uid);

    if (updateError) throw updateError;

    return res.json({
      success: true,
      tag_uid: uid,
      owner: email.toLowerCase(),
      claimed_at: new Date().toISOString(),
      counter_at_claim: tag.last_counter,
      message: 'Product ownership claimed. This has been recorded in the provenance chain.',
    });

  } catch (err) {
    console.error('Claim error:', err);
    return res.status(500).json({ error: 'claim_failed' });
  }
});

module.exports = router;

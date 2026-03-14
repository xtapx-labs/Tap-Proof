// ─────────────────────────────────────────────
// XtapX Transfer Route — Ownership Transfer
// ─────────────────────────────────────────────
// POST /api/transfer           — Initiate transfer
// POST /api/transfer/accept    — Accept transfer (new buyer)
// ─────────────────────────────────────────────
const express  = require('express');
const router   = express.Router();
const supabase = require('../db');
const { v4: uuidv4 } = require('uuid');

// ── Initiate Transfer ───────────────────────
router.post('/transfer', async (req, res) => {
  try {
    const { tag_uid, from_email, to_email } = req.body;

    if (!tag_uid || !from_email || !to_email) {
      return res.status(400).json({ error: 'tag_uid, from_email, and to_email are required' });
    }

    const uid = tag_uid.toUpperCase();

    // ── Verify ownership ────────────────────
    const { data: tag, error: tagError } = await supabase
      .from('tags')
      .select('*')
      .eq('uid', uid)
      .single();

    if (tagError || !tag) {
      return res.status(404).json({ error: 'tag_not_found' });
    }

    if (tag.current_owner !== from_email.toLowerCase()) {
      return res.status(403).json({
        error: 'not_owner',
        message: 'Only the current owner can initiate a transfer.',
      });
    }

    // ── Generate transfer token ─────────────
    const transferToken = uuidv4();
    const counterAtTransfer = tag.last_counter;

    // Store the pending transfer
    const { error: insertError } = await supabase.from('transfers').insert({
      tag_uid:             uid,
      from_email:          from_email.toLowerCase(),
      to_email:            to_email.toLowerCase(),
      transfer_token:      transferToken,
      counter_at_initiate: counterAtTransfer,
      status:              'pending',
      initiated_at:        new Date().toISOString(),
    });

    if (insertError) throw insertError;

    return res.json({
      success: true,
      transfer_token: transferToken,
      tag_uid: uid,
      from: from_email.toLowerCase(),
      to: to_email.toLowerCase(),
      counter_at_initiate: counterAtTransfer,
      message: 'Transfer initiated. The new buyer must tap the tag and then accept the transfer.',
    });

  } catch (err) {
    console.error('Transfer initiate error:', err);
    return res.status(500).json({ error: 'transfer_failed' });
  }
});

// ── Accept Transfer ─────────────────────────
router.post('/transfer/accept', async (req, res) => {
  try {
    const { transfer_token, to_email } = req.body;

    if (!transfer_token || !to_email) {
      return res.status(400).json({ error: 'transfer_token and to_email are required' });
    }

    // ── Find the pending transfer ───────────
    const { data: transfer, error: xferError } = await supabase
      .from('transfers')
      .select('*')
      .eq('transfer_token', transfer_token)
      .eq('status', 'pending')
      .single();

    if (xferError || !transfer) {
      return res.status(404).json({ error: 'transfer_not_found_or_expired' });
    }

    if (transfer.to_email !== to_email.toLowerCase()) {
      return res.status(403).json({ error: 'email_mismatch' });
    }

    // ── Get tag to check counter advancement ─
    const { data: tag } = await supabase
      .from('tags')
      .select('*')
      .eq('uid', transfer.tag_uid)
      .single();

    if (!tag) {
      return res.status(404).json({ error: 'tag_not_found' });
    }

    // Counter must have advanced since transfer was initiated
    // (proves new buyer has physical possession — they caused a new scan)
    if (tag.last_counter <= transfer.counter_at_initiate) {
      return res.status(400).json({
        error: 'counter_not_advanced',
        message: 'The new buyer must scan (tap) the product before accepting the transfer. This proves physical possession.',
        current_counter: tag.last_counter,
        required_counter: transfer.counter_at_initiate + 1,
      });
    }

    // ── Release previous owner ──────────────
    await supabase
      .from('owners')
      .update({ released_at: new Date().toISOString() })
      .eq('tag_uid', transfer.tag_uid)
      .eq('owner_email', transfer.from_email)
      .is('released_at', null);

    // ── Record new ownership ────────────────
    await supabase.from('owners').insert({
      tag_uid:          transfer.tag_uid,
      owner_email:      to_email.toLowerCase(),
      claimed_at:       new Date().toISOString(),
      counter_at_claim: tag.last_counter,
      released_at:      null,
      transfer_type:    'transfer_received',
    });

    // ── Update tag owner ────────────────────
    await supabase
      .from('tags')
      .update({ current_owner: to_email.toLowerCase() })
      .eq('uid', transfer.tag_uid);

    // ── Mark transfer complete ──────────────
    await supabase
      .from('transfers')
      .update({
        status:       'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('transfer_token', transfer_token);

    return res.json({
      success: true,
      tag_uid: transfer.tag_uid,
      new_owner: to_email.toLowerCase(),
      previous_owner: transfer.from_email,
      counter_at_transfer: tag.last_counter,
      message: 'Ownership transferred. The provenance chain has been updated.',
    });

  } catch (err) {
    console.error('Transfer accept error:', err);
    return res.status(500).json({ error: 'transfer_accept_failed' });
  }
});

// ── Get pending transfers for a tag ─────────
router.get('/transfer/:uid', async (req, res) => {
  try {
    const uid = req.params.uid.toUpperCase();

    const { data, error } = await supabase
      .from('transfers')
      .select('*')
      .eq('tag_uid', uid)
      .order('initiated_at', { ascending: false });

    if (error) throw error;

    return res.json({ transfers: data || [] });
  } catch (err) {
    console.error('Transfer list error:', err);
    return res.status(500).json({ error: 'fetch_failed' });
  }
});

module.exports = router;

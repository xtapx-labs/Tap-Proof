// ─────────────────────────────────────────────
// XtapX Tag Registration Route
// ─────────────────────────────────────────────
// POST /api/register — Register a new tag + product
// POST /api/simulate-scan — Generate a simulated NFC scan (demo)
// ─────────────────────────────────────────────
const express  = require('express');
const router   = express.Router();
const supabase = require('../db');
const { generateTagKeys, encryptKeyForStorage, simulateTagScan } = require('../crypto');

// ── Register a new product tag ──────────────
router.post('/register', async (req, res) => {
  try {
    const { uid, product_name, product_brand, product_image, product_sku, registered_by } = req.body;

    if (!uid || !product_name || !product_brand) {
      return res.status(400).json({ error: 'uid, product_name, and product_brand are required' });
    }

    // Check if UID already registered
    const { data: existing } = await supabase
      .from('tags')
      .select('uid')
      .eq('uid', uid.toUpperCase())
      .single();

    if (existing) {
      return res.status(409).json({ error: 'tag_already_registered' });
    }

    // Generate cryptographic keys
    const { piccKey, cmacKey } = generateTagKeys();

    // Encrypt keys for storage
    const secretKeyEnc = encryptKeyForStorage(piccKey);
    const cmacKeyEnc   = encryptKeyForStorage(cmacKey);

    // Store in Supabase
    const { data, error } = await supabase.from('tags').insert({
      uid:             uid.toUpperCase(),
      secret_key_enc:  secretKeyEnc,
      cmac_key_enc:    cmacKeyEnc,
      product_name,
      product_brand,
      product_image:   product_image || null,
      product_sku:     product_sku || null,
      registered_by:   registered_by || product_brand,
      last_counter:    0,
      total_scans:     0,
      current_owner:   null,
      registered_at:   new Date().toISOString(),
      status:          'active',
    }).select().single();

    if (error) throw error;

    // Build the NFC URL template
    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    const nfcUrl  = `${baseUrl}/verify?d=______&m=______`;

    return res.json({
      success: true,
      tag: {
        uid:    data.uid,
        product_name: data.product_name,
        product_brand: data.product_brand,
        registered_at: data.registered_at,
      },
      nfc_url_template: nfcUrl,
      keys: {
        picc_key: piccKey,
        cmac_key: cmacKey,
        note: 'Program these keys into the NTAG 424 DNA. They will not be shown again.',
      },
    });

  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'registration_failed' });
  }
});

// ── Simulate a tag scan (for demo purposes) ─
router.post('/simulate-scan', async (req, res) => {
  try {
    const { uid } = req.body;

    if (!uid) {
      return res.status(400).json({ error: 'uid is required' });
    }

    const { data: tag, error } = await supabase
      .from('tags')
      .select('*')
      .eq('uid', uid.toUpperCase())
      .single();

    if (error || !tag) {
      return res.status(404).json({ error: 'tag_not_found' });
    }

    // Decrypt the stored keys
    const { decryptKeyFromStorage } = require('../crypto');
    const piccKey = decryptKeyFromStorage(tag.secret_key_enc);
    const cmacKey = decryptKeyFromStorage(tag.cmac_key_enc);

    // Simulate the next counter value
    const nextCounter = (tag.last_counter || 0) + 1;

    // Generate simulated NFC output
    const scanData = simulateTagScan(tag.uid, nextCounter, piccKey, cmacKey);

    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    const verifyUrl = `${baseUrl}/verify?d=${scanData.d}&m=${scanData.m}`;

    return res.json({
      success: true,
      uid: tag.uid,
      simulated_counter: nextCounter,
      scan_data: scanData,
      verify_url: verifyUrl,
      note: 'Open the verify_url in a browser to simulate an NFC tap.',
    });

  } catch (err) {
    console.error('Simulate scan error:', err);
    return res.status(500).json({ error: 'simulation_failed' });
  }
});

// ── List all registered tags ────────────────
router.get('/tags', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('tags')
      .select('uid, product_name, product_brand, product_image, product_sku, last_counter, total_scans, current_owner, registered_at, status, registered_by')
      .order('registered_at', { ascending: false });

    if (error) throw error;

    return res.json({ tags: data || [] });
  } catch (err) {
    console.error('List tags error:', err);
    return res.status(500).json({ error: 'fetch_failed' });
  }
});

module.exports = router;

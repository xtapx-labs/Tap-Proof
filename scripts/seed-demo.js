// ─────────────────────────────────────────────
// XtapX Demo Seed Script
// ─────────────────────────────────────────────
// Seeds the database with demo products for
// the CalgaryHacks 2026 live demo.
//
// Usage: npm run seed
// ─────────────────────────────────────────────
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { generateTagKeys, encryptKeyForStorage, simulateTagScan } = require('../src/crypto');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const DEMO_PRODUCTS = [
  {
    uid: '04A23B1C2D3E4F',
    product_name: 'Air Jordan 1 Retro High OG',
    product_brand: 'Nike',
    product_image: 'https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=400&q=80',
    product_sku: '555088-134',
    registered_by: 'nike@brand.com',
  },
  {
    uid: '04B45D2E3F4A5B',
    product_name: 'Ultra Boost 22',
    product_brand: 'Adidas',
    product_image: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400&q=80',
    product_sku: 'GX5460',
    registered_by: 'adidas@brand.com',
  },
  {
    uid: '04C67F3A4B5C6D',
    product_name: 'Classic Leather Watch',
    product_brand: 'Rolex',
    product_image: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=400&q=80',
    product_sku: 'CLW-2026',
    registered_by: 'rolex@brand.com',
  },
];

async function seed() {
  console.log('\n  🌱 XtapX Demo Seed\n');

  for (const product of DEMO_PRODUCTS) {
    // Check if already exists
    const { data: existing } = await supabase
      .from('tags')
      .select('uid')
      .eq('uid', product.uid)
      .single();

    if (existing) {
      console.log(`  ⏭  ${product.product_name} (${product.uid}) — already exists, skipping`);
      continue;
    }

    // Generate keys
    const { piccKey, cmacKey } = generateTagKeys();
    const secretKeyEnc = encryptKeyForStorage(piccKey);
    const cmacKeyEnc   = encryptKeyForStorage(cmacKey);

    // Insert tag
    const { error } = await supabase.from('tags').insert({
      uid:            product.uid,
      secret_key_enc: secretKeyEnc,
      cmac_key_enc:   cmacKeyEnc,
      product_name:   product.product_name,
      product_brand:  product.product_brand,
      product_image:  product.product_image,
      product_sku:    product.product_sku,
      registered_by:  product.registered_by,
      last_counter:   0,
      total_scans:    0,
      current_owner:  null,
      registered_at:  new Date().toISOString(),
      status:         'active',
    });

    if (error) {
      console.error(`  ❌ Failed to seed ${product.product_name}:`, error.message);
      continue;
    }

    console.log(`  ✅ ${product.product_name}`);
    console.log(`     UID:      ${product.uid}`);
    console.log(`     PICC Key: ${piccKey}`);
    console.log(`     CMAC Key: ${cmacKey}`);

    // Generate a test scan URL
    const scanData = simulateTagScan(product.uid, 1, piccKey, cmacKey);
    const baseUrl  = process.env.BASE_URL || 'http://localhost:5000';
    console.log(`     Test URL: ${baseUrl}/verify?d=${scanData.d}&m=${scanData.m}`);
    console.log('');
  }

  console.log('  🎉 Demo seed complete!\n');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});

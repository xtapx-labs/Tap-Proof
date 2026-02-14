// ─────────────────────────────────────────────
// XtapX Crypto Engine
// ─────────────────────────────────────────────
// Implements NTAG 424 DNA SUN/SDM verification:
//   - AES-128-CBC decryption of PICCData
//   - AES-CMAC signature verification
//   - Counter extraction and UID recovery
// ─────────────────────────────────────────────
const crypto = require('crypto');

const IV_ZERO = Buffer.alloc(16, 0); // 16 zero-bytes IV for AES-128-CBC

// ─── AES-128-CBC Decrypt ────────────────────
// Decrypts the encrypted PICCData block from the NFC tag
// Input:  hex-encoded ciphertext, hex-encoded key
// Output: { uid, counter } or throws on failure
function decryptPICCData(encryptedHex, keyHex) {
  try {
    const key        = Buffer.from(keyHex, 'hex');
    const ciphertext = Buffer.from(encryptedHex, 'hex');

    const decipher = crypto.createDecipheriv('aes-128-cbc', key, IV_ZERO);
    decipher.setAutoPadding(false);

    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

    // NTAG 424 DNA PICCData format (16 bytes):
    // Byte 0:      tag type indicator (0xC7 = UID + counter mirrored)
    // Bytes 1-7:   7-byte UID
    // Bytes 8-10:  3-byte counter (little-endian)
    // Bytes 11-15: padding / RFU

    const tagType = plaintext[0];
    if (tagType !== 0xC7) {
      return { valid: false, reason: 'invalid_picc_header' };
    }

    const uid = plaintext.slice(1, 8).toString('hex').toUpperCase();
    const counter = plaintext[8] | (plaintext[9] << 8) | (plaintext[10] << 16);

    return { valid: true, uid, counter };
  } catch (err) {
    return { valid: false, reason: 'decryption_failed' };
  }
}

// ─── AES-CMAC Computation ───────────────────
// Implements AES-CMAC (RFC 4493) for NTAG 424 DNA signature verification
function aesCMAC(keyHex, message) {
  const key = Buffer.from(keyHex, 'hex');

  // Step 1: Generate subkeys
  const cipher0 = crypto.createCipheriv('aes-128-ecb', key, null);
  cipher0.setAutoPadding(false);
  const L = cipher0.update(Buffer.alloc(16, 0));
  cipher0.final();

  const K1 = generateSubkey(L);
  const K2 = generateSubkey(K1);

  // Step 2: Process message blocks
  const msgBuf = Buffer.isBuffer(message) ? message : Buffer.from(message, 'hex');
  const n = msgBuf.length === 0 ? 1 : Math.ceil(msgBuf.length / 16);
  const lastBlockComplete = (msgBuf.length > 0) && (msgBuf.length % 16 === 0);

  // Build padded/XORed last block
  let lastBlock = Buffer.alloc(16, 0);
  const lastStart = (n - 1) * 16;

  if (lastBlockComplete) {
    for (let i = 0; i < 16; i++) {
      lastBlock[i] = msgBuf[lastStart + i] ^ K1[i];
    }
  } else {
    // Copy remaining bytes
    const remaining = msgBuf.length - lastStart;
    for (let i = 0; i < remaining; i++) {
      lastBlock[i] = msgBuf[lastStart + i];
    }
    lastBlock[remaining] = 0x80; // padding
    for (let i = 0; i < 16; i++) {
      lastBlock[i] ^= K2[i];
    }
  }

  // Step 3: CBC-MAC
  let X = Buffer.alloc(16, 0);
  for (let i = 0; i < n - 1; i++) {
    const block = msgBuf.slice(i * 16, (i + 1) * 16);
    const Y = xorBuffers(X, block);
    const cipherN = crypto.createCipheriv('aes-128-ecb', key, null);
    cipherN.setAutoPadding(false);
    X = cipherN.update(Y);
    cipherN.final();
  }

  const Y = xorBuffers(X, lastBlock);
  const cipherFinal = crypto.createCipheriv('aes-128-ecb', key, null);
  cipherFinal.setAutoPadding(false);
  const mac = cipherFinal.update(Y);
  cipherFinal.final();

  return mac;
}

// ─── CMAC Subkey Generation ─────────────────
function generateSubkey(input) {
  const shifted = Buffer.alloc(16);
  let carry = 0;
  for (let i = 15; i >= 0; i--) {
    const tmp = (input[i] << 1) | carry;
    shifted[i] = tmp & 0xFF;
    carry = (input[i] & 0x80) ? 1 : 0;
  }
  if (input[0] & 0x80) {
    shifted[15] ^= 0x87; // Rb constant for 128-bit
  }
  return shifted;
}

// ─── XOR two buffers ────────────────────────
function xorBuffers(a, b) {
  const result = Buffer.alloc(a.length);
  for (let i = 0; i < a.length; i++) {
    result[i] = a[i] ^ b[i];
  }
  return result;
}

// ─── Verify CMAC Signature ──────────────────
// Verifies the CMAC from the NFC tag against expected data
// The CMAC key is derived from the tag's secret key
// Returns true if signature matches
function verifyCMAC(cmacHex, cmacKeyHex, uid, counter, encryptedHex) {
  try {
    // Build the SV (Session Vector) for CMAC verification
    // NTAG 424 DNA uses: SV = 0x3CC300 + 01 + uid(7) + counter(3)
    const sv = Buffer.alloc(16, 0);
    sv[0] = 0x3C;
    sv[1] = 0xC3;
    sv[2] = 0x00;
    sv[3] = 0x01;

    const uidBuf = Buffer.from(uid, 'hex');
    uidBuf.copy(sv, 4, 0, 7);

    sv[11] = counter & 0xFF;
    sv[12] = (counter >> 8) & 0xFF;
    sv[13] = (counter >> 16) & 0xFF;

    // Derive session MAC key
    const sessionKey = aesCMAC(cmacKeyHex, sv);

    // Build the message that was signed (the full URL sans the CMAC itself)
    // For simplicity in our system, we CMAC over the encrypted PICCData
    const macInput = Buffer.from(encryptedHex, 'hex');
    const computedMAC = aesCMAC(sessionKey.toString('hex'), macInput);

    // NTAG 424 DNA truncates CMAC to 8 bytes (every other byte)
    const truncated = Buffer.alloc(8);
    for (let i = 0; i < 8; i++) {
      truncated[i] = computedMAC[i * 2 + 1];
    }

    const expectedHex = truncated.toString('hex').toUpperCase();
    const receivedHex = cmacHex.toUpperCase();

    return expectedHex === receivedHex;
  } catch (err) {
    return false;
  }
}

// ─── Generate Tag Keys ──────────────────────
// Generates a random AES-128 key pair for a new tag
// Returns { piccKey, cmacKey } as hex strings
function generateTagKeys() {
  return {
    piccKey: crypto.randomBytes(16).toString('hex'),
    cmacKey: crypto.randomBytes(16).toString('hex'),
  };
}

// ─── Encrypt key for storage ────────────────
function encryptKeyForStorage(keyHex) {
  const masterKey = Buffer.from(process.env.MASTER_KEY, 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-128-cbc', masterKey, iv);
  const encrypted = Buffer.concat([cipher.update(Buffer.from(keyHex, 'hex')), cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

// ─── Decrypt key from storage ───────────────
function decryptKeyFromStorage(stored) {
  const [ivHex, encHex] = stored.split(':');
  const masterKey = Buffer.from(process.env.MASTER_KEY, 'hex');
  const decipher = crypto.createDecipheriv('aes-128-cbc', masterKey, Buffer.from(ivHex, 'hex'));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(encHex, 'hex')), decipher.final()]);
  return decrypted.toString('hex');
}

// ─── Simulate a tag scan (for demo/testing) ─
// Generates the encrypted PICCData and CMAC that a real NTAG 424 DNA would produce
function simulateTagScan(uid, counter, piccKeyHex, cmacKeyHex) {
  // Build plaintext PICCData
  const plaintext = Buffer.alloc(16, 0);
  plaintext[0] = 0xC7; // UID + counter mirror
  Buffer.from(uid, 'hex').copy(plaintext, 1, 0, 7);
  plaintext[8]  = counter & 0xFF;
  plaintext[9]  = (counter >> 8) & 0xFF;
  plaintext[10] = (counter >> 16) & 0xFF;
  // bytes 11-15: random padding
  crypto.randomBytes(5).copy(plaintext, 11);

  // Encrypt
  const cipher = crypto.createCipheriv('aes-128-cbc', Buffer.from(piccKeyHex, 'hex'), IV_ZERO);
  cipher.setAutoPadding(false);
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const encryptedHex = encrypted.toString('hex').toUpperCase();

  // Compute CMAC
  const sv = Buffer.alloc(16, 0);
  sv[0] = 0x3C;
  sv[1] = 0xC3;
  sv[2] = 0x00;
  sv[3] = 0x01;
  Buffer.from(uid, 'hex').copy(sv, 4, 0, 7);
  sv[11] = counter & 0xFF;
  sv[12] = (counter >> 8) & 0xFF;
  sv[13] = (counter >> 16) & 0xFF;

  const sessionKey = aesCMAC(cmacKeyHex, sv);
  const macInput = Buffer.from(encryptedHex, 'hex');
  const fullMAC = aesCMAC(sessionKey.toString('hex'), macInput);

  // Truncate to 8 bytes (every other byte, starting at index 1)
  const truncated = Buffer.alloc(8);
  for (let i = 0; i < 8; i++) {
    truncated[i] = fullMAC[i * 2 + 1];
  }

  return {
    d: encryptedHex,
    m: truncated.toString('hex').toUpperCase(),
  };
}

module.exports = {
  decryptPICCData,
  aesCMAC,
  verifyCMAC,
  generateTagKeys,
  encryptKeyForStorage,
  decryptKeyFromStorage,
  simulateTagScan,
};

-- ═══════════════════════════════════════════════
-- XtapX — Supabase Database Schema
-- Run this in Supabase SQL Editor to create tables
-- ═══════════════════════════════════════════════

-- ── Tags Table ──────────────────────────────
-- Every registered NFC tag and its product info
CREATE TABLE IF NOT EXISTS tags (
  uid             TEXT PRIMARY KEY,
  secret_key_enc  TEXT NOT NULL,          -- AES-128 PICC key (encrypted at rest)
  cmac_key_enc    TEXT NOT NULL,          -- AES-128 CMAC key (encrypted at rest)
  product_name    TEXT NOT NULL,
  product_brand   TEXT NOT NULL,
  product_image   TEXT,
  product_sku     TEXT,
  registered_by   TEXT,
  last_counter    INTEGER DEFAULT 0,
  total_scans     INTEGER DEFAULT 0,
  current_owner   TEXT,
  registered_at   TIMESTAMPTZ DEFAULT NOW(),
  status          TEXT DEFAULT 'active'   -- active / flagged / tampered
);

-- ── Scans Table ─────────────────────────────
-- Every verification event (the scan ledger)
CREATE TABLE IF NOT EXISTS scans (
  id              BIGSERIAL PRIMARY KEY,
  tag_uid         TEXT NOT NULL,
  counter_value   INTEGER NOT NULL,
  result          TEXT NOT NULL,          -- authentic / counterfeit / suspicious
  result_reason   TEXT,
  ip_address      TEXT,
  scanned_at      TIMESTAMPTZ DEFAULT NOW(),
  scanned_by      TEXT
);

-- Index for fast lookups by tag
CREATE INDEX IF NOT EXISTS idx_scans_tag_uid ON scans(tag_uid);
CREATE INDEX IF NOT EXISTS idx_scans_scanned_at ON scans(scanned_at);

-- ── Owners Table ────────────────────────────
-- Ownership chain / provenance
CREATE TABLE IF NOT EXISTS owners (
  id               BIGSERIAL PRIMARY KEY,
  tag_uid          TEXT NOT NULL,
  owner_email      TEXT NOT NULL,
  claimed_at       TIMESTAMPTZ DEFAULT NOW(),
  counter_at_claim INTEGER NOT NULL,
  released_at      TIMESTAMPTZ,
  transfer_type    TEXT NOT NULL          -- initial_claim / transfer_received
);

-- Index for fast lookups by tag
CREATE INDEX IF NOT EXISTS idx_owners_tag_uid ON owners(tag_uid);

-- ── Transfers Table ─────────────────────────
-- Pending and completed ownership transfers
CREATE TABLE IF NOT EXISTS transfers (
  id                  BIGSERIAL PRIMARY KEY,
  tag_uid             TEXT NOT NULL,
  from_email          TEXT NOT NULL,
  to_email            TEXT NOT NULL,
  transfer_token      TEXT NOT NULL UNIQUE,
  counter_at_initiate INTEGER NOT NULL,
  status              TEXT DEFAULT 'pending',   -- pending / completed / expired
  initiated_at        TIMESTAMPTZ DEFAULT NOW(),
  completed_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_transfers_token ON transfers(transfer_token);
CREATE INDEX IF NOT EXISTS idx_transfers_tag_uid ON transfers(tag_uid);

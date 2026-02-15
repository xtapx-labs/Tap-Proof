XtapX Security Review by claude
Summary
The application has no authentication or authorization infrastructure on any backend endpoint. Every write operation and every data-retrieval endpoint is fully public. This is the single root-cause behind the majority of findings below.
Vuln 1: Unauthenticated Tag Registration Leaks Cryptographic Keys — src/routes/register.js:13
Severity: HIGH | Confidence: 9/10
Category: Authorization bypass / cryptographic key exposure
Description: POST /api/register creates a new NFC tag entry and returns the plaintext picc_key and cmac_key in the response body. No authentication, API key, or session check exists anywhere on this endpoint or in middleware.
Exploit Scenario: An attacker POSTs to /api/register with an arbitrary UID and product name. The response contains the two AES-128 keys in hex. With those keys, the attacker can call simulateTagScan() logic manually to produce valid encrypted PICC data and CMAC signatures, forging verified scans for any product they registered — completely defeating the authentication model.
Recommendation: Gate this endpoint behind an admin API key or Supabase Auth session. Keys should never be returned after the initial registration response; they should only be used server-side.
Vuln 2: Unauthenticated Scan Simulation Exposes Live Tag Keys — src/routes/register.js:85
Severity: HIGH | Confidence: 9/10
Category: Cryptographic key exposure
Description: POST /api/simulate-scan looks up a tag by UID, decrypts its stored AES keys from the database, and uses them to generate a valid verification URL. No authentication. The returned URL embeds a valid PICC ciphertext + CMAC for the real tag.
Exploit Scenario: Attacker sends { "uid": "04A23B1C2D3E4F" }. The server decrypts and uses the real piccKey and cmacKey for that tag, returning a URL like /verify?d=<valid_enc>&m=<valid_cmac>. The attacker can replay this URL to generate a legitimate-looking "authentic" scan for a counterfeit product, injecting a fraudulent entry into the immutable scan ledger.
Recommendation: Remove or disable this endpoint in production entirely. For dev/demo use, restrict it to localhost or require an admin credential.
Vuln 3: Ownership Claim with No Identity Verification — src/routes/claim.js:10
Severity: HIGH | Confidence: 9/10
Category: Authorization bypass
Description: POST /api/claim records any submitted email as the owner of a tag. The only server-side check is that current_owner is null (line ~38). There is no proof the requester controls the submitted email address.
Exploit Scenario: Attacker sends { "tag_uid": "04A23B1C2D3E4F", "email": "attacker@evil.com" } before a legitimate owner claims the product. The attacker becomes the recorded owner in the provenance chain. Even post-launch, any unclaimed product in the system can be silently squatted.
Recommendation: Require email verification (e.g. a one-time code sent to the address) before recording a claim, or tie claims to an authenticated session.
Vuln 4: Ownership Transfer Spoofable via Email Forgery — src/routes/transfer.js:13
Severity: HIGH | Confidence: 9/10
Category: Authorization bypass
Description: POST /api/transfer initiates a transfer by checking tag.current_owner !== from_email (line ~34). Because there is no authentication, an attacker who knows the current owner's email can initiate a transfer from that email to themselves. The current owner's email is exposed by multiple unauthenticated read endpoints (see Vulns 6–8).
Exploit Scenario:
Attacker calls GET /api/history/<uid> → learns current_owner: "victim@example.com".
Attacker calls POST /api/transfer with { "tag_uid": "...", "from_email": "victim@example.com", "to_email": "attacker@evil.com" }.
A pending transfer record is created. Attacker then physically taps the tag to advance the counter, and accepts the transfer.
Recommendation: Require the initiating request to carry a verified session or signed token proving control of from_email.
Vuln 5: Transfer Acceptance Has No Recipient Authentication — src/routes/transfer.js:75
Severity: HIGH | Confidence: 9/10
Category: Authorization bypass
Description: POST /api/transfer/accept completes a transfer by matching transfer_token (a UUID) and to_email. No session or credential proves the caller is the intended recipient. Because the attacker in Vuln 4 generates the transfer themselves, they already know the token.
Exploit Scenario: Following from Vuln 4, the attacker calls POST /api/transfer/accept with { "transfer_token": "<uuid_they_created>", "to_email": "attacker@evil.com" } after tapping the tag once. Transfer completes; attacker is now recorded owner.
Recommendation: Require the accepting party to authenticate (e.g. verify their email or hold a session token issued upon email verification).
Vuln 6: PII Leakage via Unauthenticated Lookup Endpoint — src/routes/verify.js:295
Severity: MEDIUM | Confidence: 9/10
Category: Sensitive data exposure
Description: GET /verify/lookup/:uid returns the full provenance chain (all owner email addresses + transfer dates), complete scan history, and per-scan IP addresses. No authentication required. The UID space is short (7-byte hex), making enumeration feasible.
Exploit Scenario: An attacker iterates UIDs to harvest email addresses and correlated IP addresses. The combination of owner email + scan IP + timestamp enables building geographic profiles of product owners and supply chain actors.
Recommendation: Strip IP addresses from public responses. Mask email addresses (e.g. v****@example.com) or require authentication before returning ownership details.
Vuln 7: PII Leakage via Unauthenticated History Endpoint — src/routes/history.js:10
Severity: MEDIUM | Confidence: 9/10
Category: Sensitive data exposure
Description: GET /api/history/:uid returns the complete ownership chain (owner emails, claim/release timestamps), all scan records with IP addresses, and transfer history. Identical exposure surface to Vuln 6 via a different endpoint.
Exploit Scenario: Same as Vuln 6 — enables bulk enumeration of owner PII and movement patterns.
Recommendation: Same as Vuln 6. Additionally, consider requiring a valid NFC scan proof (counter value + CMAC) before revealing ownership details, preserving the "physical access = information access" model.
Vuln 8: Owner PII Exposed in Tag Listing — src/routes/register.js:133
Severity: MEDIUM | Confidence: 8/10
Category: Sensitive data exposure
Description: GET /api/tags returns current_owner (email) for every registered tag alongside product metadata, scan counts, and counter values. No authentication.
Exploit Scenario: A single request dumps the email address of every product owner in the system, providing a ready-made target list for Vulns 3–5.
Recommendation: Remove current_owner from this response, or restrict the endpoint to admin use.
Root Cause & Systemic Fix
All HIGH findings stem from the same gap: zero server-side authentication exists. The recommended approach:
Add an adminAuth middleware (API key or Supabase Auth JWT) and apply it to POST /api/register, POST /api/simulate-scan, and GET /api/tags.
Add email-ownership verification (OTP or magic link) before recording claims or accepting transfers.
Scrub IP addresses from all public API responses; mask or gate owner emails behind authentication.
# TapProof Threat Model (Public)
Version: 0.1 (public)
Last updated: 2026-02-06

This is a high-level threat model intended for pilots, partners, and reviewers. It describes what TapProof defends against, what it does not defend against, and the broad security posture. It intentionally omits internal detection logic, thresholds, key-management procedures, and operational playbooks.

## 1) Scope
TapProof provides per-tap cryptographic verification for NFC-tagged physical products using secure NFC tags that emit a dynamic cryptographic payload on each tap, plus a backend verification service.

In scope:
- Tag-generated dynamic payload (anti-replay, anti-forgery at scale).
- Phone-to-backend verification flow (browser and app-based entry points).
- Verification backend (decisioning + event logging).
- Admin and provisioning services at a conceptual level.
- Provenance and ownership features at a conceptual level.

Out of scope:
- Full physical verification of product contents without additional binding measures.
- Preventing theft, diversion, or resale of genuine goods.
- Compromised end-user devices beyond reasonable assumptions.

## 2) Security Goals
Primary goals:
- Make large-scale cloning and replay economically infeasible without key compromise.
- Detect suspicious verification activity that suggests misuse or counterfeiting.
- Protect cryptographic secrets and provisioning materials from unauthorized access.
- Provide reliable verification results with clear degraded behavior during outages.

Non-goals:
- Guaranteeing the physical item is genuine if a genuine tag has been physically transferred.
- Eliminating all relay attacks in all environments.

## 3) System Summary (High level)
Typical verification flow:
1. A user taps the product tag.
2. The phone reads a URL or record containing a dynamic per-tap payload.
3. The phone opens TapProof verification.
4. TapProof validates the cryptographic payload and expected state.
5. TapProof returns a verdict and records an event (where configured).

Core property:
- The tag does not store a static proof; it generates a fresh proof per tap.

## 4) Assets
High value assets:
- Cryptographic keys used to validate tag payloads.
- Provisioning data and logs (tag issuance, activation, and lifecycle state).
- Administrative access to systems that can change tag status or verification policies.
- Provenance / ownership records (when enabled).

Medium value assets:
- Scan metadata and telemetry used for fraud analysis.
- Public identifiers (tag IDs, SKU associations).

## 5) Trust Boundaries
- The NFC tag hardware is assumed to protect secrets under realistic attacker budgets.
- The phone and browser are untrusted clients; all inputs are treated as attacker-controlled.
- The network is untrusted; integrity relies on HTTPS/TLS.
- The verification backend and key custody systems form the trusted computing base.

## 6) Attacker Model
A1. Casual counterfeiters
- Copy QR codes, static NFC URLs, screenshots, basic duplication.

A2. Organized counterfeit operations
- Tag harvesting, supply-chain manipulation, coordinated abuse attempts.

A3. Insider threats
- Unauthorized access during manufacturing, provisioning, or operations.

A4. Advanced adversaries
- High-budget hardware attacks (side-channel/fault attempts) targeting secure silicon.

TapProof is designed primarily to defeat A1 and materially raise costs for A2. A3 is addressed through operational controls and auditability. A4 is treated as low-probability and mitigated with diversification and response capability.

## 7) Threats and High-Level Mitigations

### 7.1 Replay and cloning
Threat: Reusing a captured scan payload (replay).
- Mitigation: Verification enforces per-tag state rules to reject stale/reused payloads and prevent acceptance of previously observed proofs.

Threat: Cloning static identifiers (UID, fixed NDEF URL, QR).
- Mitigation: TapProof treats static identifiers as insufficient. Cryptographic per-tap proofs are required for authentication.

### 7.2 Genuine tag misuse (binding problem)
Threat: A genuine tag is removed and attached to a counterfeit product.
- Mitigation: Prefer tamper-evident tag constructions when packaging allows. Where tamper evidence is not possible, TapProof supports product-tag binding strategies (multi-factor correlation) that reduce the usefulness of tag transfer.

Limitation: Any system that authenticates a tag can be defeated if a genuine tag is physically transferred and there is no effective binding.

### 7.3 Relay / proxy attacks
Threat: A verification event is relayed to a genuine tag elsewhere in real time.
- Mitigation: TapProof uses backend analytics and abuse controls to identify suspicious verification patterns and reduce practical exploitability. Relay attacks remain a known limitation for NFC systems in general.

### 7.4 Backend compromise and data tampering
Threat: An attacker compromises backend services to forge verdicts or tamper with history.
- Mitigation: Segmented services, least privilege, strong authentication, audit logs, and hardened key custody. Provenance features favor append-only event recording with auditability.

### 7.5 Availability failures
Threat: Verification service outage or network unavailability.
- Mitigation: The system distinguishes between “cannot verify” and “counterfeit.” High-availability architecture is used for the verification layer. Enterprise deployments can optionally use defined fallback modes appropriate to their risk tolerance.

### 7.6 Provisioning and supply-chain compromise
Threat: Keys or provisioning processes are compromised (insider or vendor).
- Mitigation: Controlled key custody, strict access controls, auditability, and reconciliation of issuance. TapProof supports key-scoping strategies that limit blast radius if a compromise is suspected.

Note: Provisioning security is one of the most important determinants of overall system security.

## 8) Monitoring and Detection (Public overview)
TapProof can record verification events and support detection of:
- Repeat verifications inconsistent with expected per-tap behavior.
- Non-human usage patterns (high-frequency scanning).
- Geographically implausible verification sequences.
- Elevated invalid-proof rates for a SKU or batch.

Detection logic and thresholds are implementation details and are not published in this document.

## 9) Incident Response (Public overview)
TapProof supports operational response to suspected compromise through:
- Tag and key scope isolation (ability to mark affected populations as “review required”).
- Revocation and lifecycle state changes.
- Forensic logging to support investigation.
- Clear customer-facing messaging when verification cannot be completed.

Specific runbooks and procedures are internal.

## 10) Residual Risks and Honest Limits
TapProof materially reduces scalable cloning and replay, but the following limits remain:
- A genuine tag can authenticate on a counterfeit product if physically transferred and binding is weak.
- Relay attacks are possible in principle and are mitigated primarily through detection and operational controls.
- If provisioning or key custody is compromised, assurance is reduced for the affected scope.
- Verification depends on backend availability unless an approved offline strategy is deployed.

## 11) Security Posture Commitments (Public)
- No reliance on “security through obscurity” for core assurance; authenticity derives from cryptographic validation.
- Client is treated as untrusted; all decisions are made server-side.
- Keys are treated as high-sensitivity secrets with controlled custody.
- System design favors auditability for disputes and investigations.

## 12) Disclosure
TapProof is an independent project and is not affiliated with NFC chip manufacturers. Product and company names are trademarks of their respective owners.

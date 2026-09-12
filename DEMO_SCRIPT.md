# AgriShield Insurance - Hackathon Demo Script & Judge Walkthrough

**Project Name:** AgriShield Insurance  
**Category:** Offline-First Parametric Micro-Insurance for Smallholder Farmers  
**Tech Stack:** React 19 + Vite + Tailwind CSS + Node.js/Express + SQLite (WAL Mode) + Progressive Web App (PWA) + IndexedDB Offline Queue + 3-Source Weather Oracle Consensus Engine

---

## Live Demo Workflow (8 Steps)

### Step 1: Normal Operation & Multilingual Voice Explainer
1. Open the application at `http://localhost:3000/`.
2. Click **"Ramesh (Farmer Demo)"** to log in instantly as a registered smallholder paddy farmer in Karimnagar, Telangana.
3. Review the **Farmer Dashboard**:
   - **Active Policies**: "AgriShield Rainfall Protection Plan" (Paddy crop, threshold < 100 mm rainfall, ₹10,000 micro-payout).
   - **Weather Consensus Widget**: Live rainfall oracle displaying 3 independent sources (IMD Ground Station, Skymet Radar, NASA Earth Observation Satellite).
   - **Explainable Policy Conditions**: Visual trigger rules with rainfall progress bars and eligibility criteria.
4. Click the **Language Switcher** in the header to switch to **తెలుగు (Telugu)**:
   - Notice the UI labels instantly translate.
   - Click **"వాయిస్ వివరణ వినండి" (Listen to Audio Explanation)** in the Voice Explainer card.
   - Listen to the browser's speech synthesis vocalize the policy status and settlement rules in natural Telugu.
   - Switch back to English or keep bilingual.

---

### Step 2: Internet Disconnect (Zero Connectivity Simulation)
1. Look at the top **Hackathon Demo Suite bar** (or the simulated offline toggle).
2. Toggle the switch to **"Simulated Offline"** (or open browser DevTools > Network > Offline).
3. Notice:
   - The top banner turns Amber: `OFFLINE MODE (LOCAL STORAGE ENGINE ACTIVE)`.
   - The offline claim queue indicator shows `0 Queued`.
   - Cached policies, weather, and claims remain 100% accessible via the Service Worker cache and IndexedDB storage.

---

### Step 3: Submit Claim While Offline
1. Click **"Submit Claim"** on the active Paddy Rainfall Protection policy.
2. In the modal:
   - The policy, location, and crop are auto-filled.
   - Click **"Submit Claim (Offline Queue)"**.
3. **Observation:**
   - The claim is saved immediately to client-side IndexedDB.
   - A unique offline cryptographic reference is generated (`OFF-...`).
   - A success banner informs the farmer: *"Claim saved securely on your device. It will automatically synchronize as soon as internet connectivity is restored."*
   - The offline indicator now shows `1 Queued`.
   - In the Claims tab, the claim appears with the status **Saved Offline** (Amber badge).

---

### Step 4: Weather Outlier Simulation (Judges Test)
1. On the Demo Suite Bar, test the **Weather Scenarios**:
   - Click **"Outlier Source (72, 71, 180 mm)"**.
2. **Observation:**
   - Source 3 reports 180 mm (a sensor glitch or manipulation attempt).
   - The deterministic consensus algorithm computes the mathematical median: `median([71, 72, 180]) = 72 mm`.
   - The system flags Source 3 as an **Outlier**, preventing bribery or false claim denial.
   - Because 72 mm is below the 100 mm policy threshold, the parametric drought deficit condition is verified.

---

### Step 5: Internet Reconnect & Automatic Synchronization
1. On the Demo Suite Bar, toggle back to **"Online"**.
2. **Observation:**
   - The system immediately triggers the **Automatic Sync Pipeline**.
   - A 3-step synchronization progress modal appears:
     1. **Weather Updated** (Fresh 3-source consensus calculated)
     2. **Policy Verified** (Evaluated against active threshold rules)
     3. **Claim Processed** (Deterministic approval or rejection)
   - Confetti triggers upon successful claim approval and payout generation!
   - The claim status changes from **Saved Offline** to **Approved** (`CLM-2026-XXXX`).

---

### Step 6: Instant Payout Generation
1. In the **Payouts & Settlement** tab:
   - See the newly created payout voucher for **₹10,000**.
   - Review the deterministic decision breakdown:
     - Verified Rainfall: `72 mm`
     - Policy Threshold: `< 100 mm`
     - Status: `Approved - Awaiting Bank Settlement`

---

### Step 7: Insurance Provider & Admin Verification
1. Click **Switch Role / Profile** in the top navigation, or click **"Admin Console"** on the login screen.
2. Review the **Insurance Provider Console**:
   - **Overview Metrics**: Total registered farmers, active policies, approved claims, total payouts distributed, weather outliers flagged, and offline synced count.
   - **Claims & Evaluation Tab**: Inspect the claim's verified rainfall and deterministic audit explanation.
   - **Weather Oracles Tab**: Interactive simulator for judges to test arbitrary source inputs (e.g. 45mm drought or 210mm flood).
   - **Offline Device Sync Monitoring**: View connected farmer devices, last sync timestamps, and real-time offline queue counts.
   - **Payout Settlements Tab**: Click **"Settle Payout"** to execute mock core banking settlement and assign a settlement transaction reference.
   - **Deterministic Audit Trail**: Inspect the immutable chronological event log with timestamps and cryptographic payloads.

---

### Step 8: Production Health & Prometheus Metrics
1. Click **/healthz & /metrics** in the footer.
2. Inspect:
   - System health, database connectivity, and uptime.
   - Key business telemetry:
     - `agrishield_claims_total`
     - `agrishield_claims_offline_synced_total`
     - `agrishield_payouts_amount_inr`
     - `agrishield_weather_outliers_total`

---

## Key Differentiators for Judges

1. **True Offline Resilience**: IndexedDB + Service Worker cache enables full offline claims filing with automatic idempotent sync upon reconnection.
2. **Multi-Oracle Byzantine Fault Tolerance**: 3 independent weather sources with median calculation and outlier detection prevent oracle corruption and sensor malfunctions.
3. **No Subjective Adjusters**: 100% parametric deterministic rules — zero paperwork, zero human delay, transparent micro-payouts.
4. **Inclusive Farmer UX**: Voice explainer in Telugu & English designed specifically for rural low-connectivity smallholder farming communities.

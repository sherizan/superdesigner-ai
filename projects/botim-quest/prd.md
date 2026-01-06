# Botim Quest — PRD

Project: Botim Quest  
Version: v1  
Owner: Product (Sambhav Jalori)  
Design: Mariam Chilingarayan  
Tech Lead: Junfei Wang  
Growth POC: Aayushi Bansal  

---

## 1. Overview

Botim Quest is a **gamified, time-bound challenge system** inside the Botim app designed to drive specific fintech actions.

Quests are **personalized based on user lifecycle and behavior**, such as:
- Users who have not completed KYC
- Users who have not remitted yet
- Users who remit but have not used Gold or Credit products

Completing quests rewards users with **instant incentives**:
- Cashback
- Partner vouchers
- Other rewards (future: raffles, VIP membership)

---

## 2. Problem Statement

### 2.1 Current Issues
- Fintech adoption on Botim is low (~6.3% of MAU)
- Growth relies on manual, non-scalable growth hacks
- Limited experimentation due to manual setup
- Weak loyalty mechanics:
  - VIP subscriptions <1% adoption
  - Users prefer **instant, free rewards**

### 2.2 Opportunity
Introduce a **scalable, personalized quest system** that:
- Drives fintech adoption
- Enables experimentation
- Builds habit and engagement

---

## 3. Success Metrics

### 3.1 Adoption & Revenue
- +10% incremental fintech penetration (~137k new users in 2026)
- Customer acquisition cost < AED 16
- +1% overall TPV

### 3.2 Engagement
- 10% participation rate in quests
- 10% TPV uplift among participating users

---

## 4. Competitive Landscape

Comparable mechanics exist in:
- Careem Missions
- Noon Rewards

Common patterns:
- Task-based challenges
- Spend thresholds
- Instant rewards

Botim differentiates via **deep fintech integration + personalization**.

---

## 5. Product Solution — Botim Quest

### 5.1 Core Concept
- Quests are **campaign-based challenges**
- Delivered periodically
- Personalized per user cohort
- Users can:
  - View quests
  - Track progress
  - Unlock rewards

---

## 6. Quest Types (Launch Use Cases)

### 6.1 Remittance
- First remittance → AED 30 cashback / voucher
- Remit AED 2500 → AED 50 cashback / VOX voucher
- Multi-transaction challenges (e.g. Egypt corridor)

### 6.2 Gold
- First gold transaction > AED 100 → cashback
- Larger gold purchases → raffle / iPhone

### 6.3 Cards / Credit
- Activate multicurrency card → AED 20 voucher
- Combined remittance + gold spend → higher cashback

---

## 7. Quest Mechanics

### 7.1 Quest States
- **Not Started**
- **In Progress**
- **Completed**
- **Expired**

### 7.2 Rewards
- Cashback → credited to wallet
- Voucher → partner redemption
- Future: raffle, VIP

---

## 8. Entry Points

Quests appear across multiple surfaces:
- Homepage
- Money page
- Service pages (Remittance, Gold)
- Checkout & success screens
- Rewards center

---

## 9. UX Flows

### UX1 — Quest Discovery (Homepage / Money Page)
- Horizontal quest cards
- Ordered by:
  1. In Progress
  2. Not Started
  3. Completed (last 7 days)
- Earliest expiry first
- Hidden if no quests available
- Supports English & Arabic

### UX2 — Quest Detail Page
- Reward summary
- Validity
- Task list (1–N tasks)
- Progress bars
- CTAs with deep links

### UX3 — Service-Level Progress
- Remittance:
  - Homepage
  - Checkout
  - Success screen banner
- Gold:
  - Homepage
  - Review page
  - Success screen banner

### UX4 — Wallet Ledger
- Separate cashback transaction entry
- Positive, green amount
- Quest-specific labeling

### UX5 — Growth Manager Setup
- Campaigns configured in Talon.one
- Rule-based achievements
- Audience cohort targeting

---

## 10. Onboarding

### UX6 — First-Time Quest Education
- In-app onboarding explaining:
  - What quests are
  - Types of rewards
  - Where to track progress
  - How to access rewards center

---

## 11. Rewards Center

### UX7 — Consolidated Rewards
- Lifetime cashback & vouchers
- Latest rewards
- Quest overview
- Entry points:
  - Profile
  - Homepage
  - Completed quest CTA

---

## 12. Edge Cases & Unhappy Flows

- No available quests → hide quest section
- Multiple rewards triggering incorrectly
- Cashback triggered multiple times
- Campaign misconfiguration
- Quest expiry during active view
- Translation handling (Arabic)
- Cohort sync issues
- Campaign pause / termination scenarios

---

## 13. Phasing

### Phase 1 (MVP)
- KYC
- Remittance
- Gold
- Cashback + VIP
- Homepage + Money entry points

### Phase 2
- Gold onboarding

### Phase 3
- Credit (CashNow / SNPL)
- Partner vouchers
- Rewards center

---

## 14. Open Questions

- Reward content parsing & normalization
- Translation strategy (static vs real-time)
- Talon.one ↔ MoEngage sync
- Expiry logic for multi-achievement campaigns
- InfoSec approvals
- Error recovery strategies

---

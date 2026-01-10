# Gold & Silver Investment on Botim – PRD

## Overview
Launch secure gold & silver investment inside Botim for UAE users enabling buy, sell, auto-leasing and portfolio tracking.

## Objectives
- Increase retention & engagement
- Expand Botim Money beyond remittance
- Monetize via markups, fees & leasing revenue

## Key Metrics
- MAUs investing in 90 days
- Transaction Volume (AED)
- MoM retention
- Revenue by Q3

## Core Features
- Live rates (AED/gm) via WebSocket
- Buy / Sell flows with price lock
- Portfolio & returns tracking
- Returns calculator
- Auto-leasing payouts (monthly)
- Wallet limits (AED 15k/month)
- Retry mechanism for vendor downtime

## Buy Flow
- User enters AED or grams
- Rate locked for 4 minutes
- OGold order valid 5 minutes
- <0.5% price increase absorbed by Botim

## Sell Flow
- Locked rate for 4 minutes
- Settlement priority: Settlement → Merchant → Revenue → Pre-funding

## Service Fee
- AED 1 + VAT per buy/sell
- Buy: added to checkout
- Sell: deducted from payout

## Returns Formula
Future Value = Principal × (1 + r)^n

Example: 100 × (1 + 0.16)^3 = 156.09 AED

## Wallet Limits
- Monthly cap: 15,000 AED
- Per transaction: 15,000 AED

## First-Time Experience
Trusted Gold, Smarter Returns
- 24K purity
- Vault storage
- 3% extra gold p.a.
- Up to 16% predicted returns

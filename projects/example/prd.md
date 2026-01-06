---
Project: Daily Check-in Feature
Created: 2025-01-06T10:00:00.000Z
---

# Product Requirements Document

## Overview

A daily check-in feature that helps users track their mood and productivity. Users answer 3 quick questions each day and see trends over time.

## Goals

- [x] Increase daily active users by 15%
- [ ] Achieve 60% check-in completion rate
- [ ] Reduce user churn by showing engagement value

## User Stories

As a user, I want to quickly log my daily mood so that I can track patterns over time.

As a user, I want to see my check-in streak so that I feel motivated to continue.

## Happy path

1. User opens app and sees check-in prompt
2. User taps "Start Check-in" button
3. User answers mood question (emoji selector)
4. User answers productivity question (1-5 scale)
5. User adds optional note
6. User taps "Complete" button
7. User sees confirmation with streak count
8. User can view trends dashboard

## Edge cases

- User tries to check in twice in one day
- User's timezone changes during travel
- User has no internet when completing check-in
- User abandons check-in midway
- User wants to edit a previous check-in

## Out of scope

- Social features (sharing check-ins)
- AI-powered insights
- Calendar integrations

## Success metrics

- Check-in completion rate: 60%
- 7-day retention: +10%
- Average session duration: +30 seconds

## Open questions

- Should we allow backdating check-ins?
- What's the optimal time to send reminders?

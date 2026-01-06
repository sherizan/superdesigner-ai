# Superdesigner Review Context
Project: Daily Check-in Feature
Slug: example
Generated: 2026-01-06T22:43:57.181Z

---

## Extracted from PRD

### Overview
A daily check-in feature that helps users track their mood and productivity. Users answer 3 quick questions each day and see trends over time.

### Problem Statement
*Not found in PRD*

### Goals
- [x] Increase daily active users by 15%
- [ ] Achieve 60% check-in completion rate
- [ ] Reduce user churn by showing engagement value

### Happy Path
1. User opens app and sees check-in prompt
2. User taps "Start Check-in" button
3. User answers mood question (emoji selector)
4. User answers productivity question (1-5 scale)
5. User adds optional note
6. User taps "Complete" button
7. User sees confirmation with streak count
8. User can view trends dashboard

### Edge Cases
- User tries to check in twice in one day
- User's timezone changes during travel
- User has no internet when completing check-in
- User abandons check-in midway
- User wants to edit a previous check-in

### PRD Headings (for screen inference)
- Overview
- Goals
- User Stories
- Happy path
- Edge cases
- Out of scope
- Success metrics
- Open questions

---

## Extracted from Figma

### Figma URL
https://www.figma.com/file/abc123/Daily-Check-in-Feature

### File Key
abc123

### Node ID (for comment pinning)
*No node-id found in figma.md URL*

### Figma MCP Instructions
If Figma URL is available above, use Figma MCP to fetch design context:
```
mcp_Figma_get_design_context with:
  fileKey: "abc123"
  nodeId: "<NODE_ID>"
```

---

## Extracted from Research

---
Project: Daily Check-in Feature
Created: 2025-01-06T10:00:00.000Z
---

# Research Notes

## Summary

- Users want quick, frictionless check-ins (under 30 seconds)
- Streaks are highly motivating but can cause anxiety if broken
- Morning check-ins have 2x higher completion vs evening

## User pain points

1. Existing mood trackers are too complex
2. Users forget to log consistently
3. Historical data isn't actionable

## Competitor analysis

| Competitor | Approach | Strengths | Weaknesses |
|------------|----------|-----------|------------|
| Daylio | Emoji + activities | Fast entry | No insights |
| Reflectly | AI journaling | Personalized | Too long |
| Pixels | Year-in-pixels | Visual appeal | No trends |

## User quotes

> "I want to do it but I always forget. By night I can't remember how I felt in the morning."
> — Power user, interview #12

> "I gave up on [competitor] because it took too long. I just want to tap and go."
> — Churned user, exit survey

## Quantitative data

- 73% of users who check in 3+ days become weekly actives
- Morning notifications have 2.1x open rate vs evening
- Average competitor check-in time: 47 seconds

## Recommendations

1. Target sub-15-second completion time
2. Send morning reminders (8-9am local)
3. Show streak prominently but offer "streak freeze" to reduce anxiety

## Sources

- User interviews (12 participants) - Q4 2024
- Competitor audit - December 2024
- Analytics deep-dive - engagement_report_q4.pdf


---

## Extracted from Analytics

---
Project: Daily Check-in Feature
Created: 2025-01-06T10:00:00.000Z
---

# Analytics Requirements

## Key events to track

| Event name | Trigger | Properties |
|------------|---------|------------|
| checkin_started | User taps "Start Check-in" | source (home/notification/widget) |
| checkin_step_completed | User completes a step | step_name, time_spent_ms |
| checkin_completed | User finishes all steps | total_time_ms, mood_value, note_added |
| checkin_abandoned | User exits mid-flow | last_step, time_spent_ms |
| streak_displayed | Streak count shown | streak_count, is_new_record |
| trends_viewed | User opens trends | time_range_selected |

## Conversion funnel

1. App opened (baseline)
2. Check-in prompt viewed
3. Check-in started
4. Check-in completed

## Success metrics

| Metric | Current baseline | Target | Timeframe |
|--------|-----------------|--------|-----------|
| Check-in start rate | N/A | 40% | 30 days |
| Check-in completion rate | N/A | 60% | 30 days |
| 7-day ch

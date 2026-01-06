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
| 7-day check-in retention | N/A | 50% | 60 days |
| Avg completion time | N/A | <15s | 30 days |

## Segments

- New vs returning users
- Notification opters-in vs opted-out
- Morning vs evening users
- Users with/without streaks

## Dashboard requirements

- Daily check-in funnel
- Completion time distribution
- Streak distribution histogram
- Drop-off by step

## Data questions

1. At which step do users most often abandon?
2. Does streak length correlate with retention?
3. What's the optimal notification time by timezone?

## Implementation notes

- Use existing analytics SDK (Amplitude)
- Add server-side validation for streak calculation
- Consider sampling for high-frequency events

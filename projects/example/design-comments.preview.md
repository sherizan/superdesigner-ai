# Design Comments Preview
Project: Daily Check-in Feature
Generated: 2026-01-06

---

## Comment 1
Target:
  page: Overview
  frame: (optional)

Type:
  Missing State

Message:
Does this screen handle Empty, Loading, and Error states?
Consider adding visual representations for each state to ensure the design covers all scenarios.

Why:
States checklist — every screen should account for empty, loading, and error conditions

---

## Comment 2
Target:
  page: Relevant Screen
  frame: (optional)

Type:
  Edge Case

Message:
The PRD mentions this edge case: "User tries to check in twice in one day"
Is this scenario handled in the design? Consider adding a state or recovery flow.

Why:
PRD → "Edge cases" → "User tries to check in twice in one day"

---

## Comment 3
Target:
  page: Relevant Screen
  frame: (optional)

Type:
  Edge Case

Message:
The PRD mentions this edge case: "User's timezone changes during travel"
Is this scenario handled in the design? Consider adding a state or recovery flow.

Why:
PRD → "Edge cases" → "User's timezone changes during travel"

---

## Comment 4
Target:
  page: Relevant Screen
  frame: (optional)

Type:
  Edge Case

Message:
The PRD mentions this edge case: "User has no internet when completing check-in"
Is this scenario handled in the design? Consider adding a state or recovery flow.

Why:
PRD → "Edge cases" → "User has no internet when completing check-in"

---

## Comment 5
Target:
  page: Relevant Screen
  frame: (optional)

Type:
  Edge Case

Message:
The PRD mentions this edge case: "User abandons check-in midway"
Is this scenario handled in the design? Consider adding a state or recovery flow.

Why:
PRD → "Edge cases" → "User abandons check-in midway"

---

## Comment 6
Target:
  page: Relevant Screen
  frame: (optional)

Type:
  Edge Case

Message:
The PRD mentions this edge case: "User wants to edit a previous check-in"
Is this scenario handled in the design? Consider adding a state or recovery flow.

Why:
PRD → "Edge cases" → "User wants to edit a previous check-in"

---

## Comment 7
Target:
  page: Form / Input Screen
  frame: (optional)

Type:
  Validation

Message:
What happens when the user enters invalid input?
Consider showing inline error states with clear messaging on how to fix the issue.

Why:
Common UX pattern — validation feedback improves form completion rates

---

*Total: 7 comments*
*Run `npm run comment -- daily-check-in-feature` to post to Figma.*

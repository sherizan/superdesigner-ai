# DESIGN.md — design reference

This file is Superdesigner's reference for what "good" means. The **UX agent** and **Content
agent** read it to ground their findings, so a finding can cite a rule here instead of presenting
taste as fact (e.g. "this label contradicts the plain-language principle in DESIGN.md §3").

Replace the defaults below with your team's actual principles. Keep each rule short and citable.
For a single project, you can override this file with `projects/<slug>/context/DESIGN.md`, which
takes precedence when present.

---

## 1. UX principles

1. **Review intent, not pixels.** A screen is "good" when it delivers what the PRD promised, not
   when it looks polished.
2. **Every screen has five states.** Happy, empty, loading, error, recovery. A missing state is a
   gap, not a detail.
3. **Reduce cognitive load.** One primary action per screen. Don't make the user hold information
   in their head across steps.
4. **Flow clarity.** The user should always know where they are, what just happened, and what
   happens next.
5. **Trust signals scale with stakes.** The higher the consequence (money, identity, irreversible
   actions), the more explicit the confirmation and the feedback.

## 2. Voice & tone

1. **Plain and direct.** Short sentences. Common words. One idea per line.
2. **Calm under failure.** Error copy is reassuring and specific, never blaming.
3. **Consistent terms.** The same object or action uses the same word on every screen.

## 3. Plain-language & legal rules

1. **Spell out consequences for irreversible actions.** Prefer "Send AED 250 — this can't be
   undone" over "Send now".
2. **Plain-English alongside legal text.** Required legal/compliance wording is fine, but restate
   it in plain language next to it.
3. **No unexplained jargon.** If a regulated or technical term must appear, define it inline.
4. **Be exact with numbers.** Show amounts, currency, dates, and quantities explicitly and
   identically wherever the same value appears.

## 4. Component & state vocabulary

- **Empty state:** what the user sees with no data yet — explain why it's empty and the next step.
- **Loading state:** skeleton or spinner with context; never a blank screen.
- **Error state:** what went wrong (specific) + how to recover (an action).
- **Recovery path:** the route back to success after an error.
- **Confirmation:** a distinct acknowledgement that an action succeeded, especially for
  high-stakes flows.

## 5. Accessibility baseline

1. **Contrast.** Text meets WCAG AA (4.5:1 body, 3:1 large text).
2. **Touch targets.** Interactive targets are at least 44×44pt.
3. **Don't rely on color alone** to convey state (error, success, selection).
4. **Labels & order.** Every input has a visible label; focus/reading order follows the visual
   flow; meaningful images have alt text.

## 6. Microcopy conventions

1. **Buttons are verbs.** "Send money", not "Submit".
2. **Errors name the fix.** "Enter an amount over AED 1" beats "Invalid input".
3. **Empty states invite action.** End with what to do next.

# Design

Standing contract: on 2026-10-05 the user explicitly requested preserving this
adaptation for subsequent work. The shared authority is now
[Experience Design](../../spec/frontend/experience-design.md); this task keeps
the original implementation rationale and dated verification evidence.

## Art direction

An urban field journal: warm ivory paper, deep forest ink, burnt orange accents, serif Chinese display type with system sans body text, thin rules, small folio labels and route/stamp motifs. Original SVG illustration presents an imagined city, never a real map or claimed location. No remote fonts, stock imagery or extra runtime dependencies; a licensed local display subset is retained with exact notices.

Home: asymmetric editorial headline paired with a city illustration; vertical native discovery CTA; restrained process strip; numbered collection cards with alternating original map/journal/compass covers, real category/title/count/progress. The visible editorial headline is a semantic h1; catalog section is h2 and cards h3. A 12KB self-hosted OFL font subset stabilizes static Chinese headlines; dynamic text uses a consistent sans stack. List detail: editorial intro and bounded progress panel, existing search/category/sort, compact entry cards. Auth: journal illustration and focused form. Other screens adopt the shell, intro, fields, button and card vocabulary.

## Technical boundary

React Web, existing Lucide, Tailwind v4 and shared CSS. Add a reusable decorative SVG illustration and home composition; preserve generated API contracts and query keys. All actions keep native semantics. No artificial statistics or invented destinations. Short CSS entrance and hover transitions; no event-per-frame animation or remote assets. Reduced-motion rules override all movement.

## States and access

Loading remains role=status, errors role=alert, empty remains explicit. Keep real session ownership and guest redirect behavior. Focus rings and skip link remain visible; SVG decoration aria-hidden. Forms retain required labels and native validation. Auth mode switching gains proper tab keyboard/focus behavior.

## Rollback

Changes confined to frontend presentation and relevant browser tests; existing API/database unchanged. Revert only task-owned changes if needed, preserving unrelated work.

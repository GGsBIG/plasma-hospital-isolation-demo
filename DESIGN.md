---
name: Plasma Demos (Brobridge)
description: Scenario demos for Plasma in the Brobridge paper, ink and logo-red world.
colors:
  logo-red: "#b42622"
  red-deep: "#8f1d1a"
  ink: "#111111"
  paper: "#ffffff"
  sheet: "#ece9e2"
  hairline: "rgb(17 17 17 / 0.18)"
  muted-ink: "#4a4a4a"
  iso-left: "#ecebe8"
  iso-right: "#d9d7d2"
  iso-line: "#5c5c5c"
typography:
  display:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, \"SF Pro Text\", \"PingFang TC\", \"Noto Sans TC\", \"Microsoft JhengHei\", sans-serif"
    fontSize: "clamp(2.5rem, 3.8vw, 3.5rem)"
    fontWeight: 600
    lineHeight: 1.08
    letterSpacing: "-0.02em"
  numeral:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, \"SF Pro Text\", \"PingFang TC\", \"Noto Sans TC\", \"Microsoft JhengHei\", sans-serif"
    fontSize: "5rem"
    fontWeight: 700
    lineHeight: 0.9
    letterSpacing: "-0.04em"
    fontFeature: "tnum"
  title:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, \"SF Pro Text\", \"PingFang TC\", \"Noto Sans TC\", \"Microsoft JhengHei\", sans-serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  lead:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, \"SF Pro Text\", \"PingFang TC\", \"Noto Sans TC\", \"Microsoft JhengHei\", sans-serif"
    fontSize: "1.1875rem"
    fontWeight: 400
    lineHeight: 1.75
  body:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, \"SF Pro Text\", \"PingFang TC\", \"Noto Sans TC\", \"Microsoft JhengHei\", sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.75
  label:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, \"SF Pro Text\", \"PingFang TC\", \"Noto Sans TC\", \"Microsoft JhengHei\", sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 700
    letterSpacing: "0.02em"
  code:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "0.9375rem"
    fontWeight: 400
rounded:
  none: "0px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "40px"
  2xl: "56px"
  3xl: "88px"
components:
  button-bar:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0 24px"
    height: "48px"
  button-bar-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  button-bar-primary:
    backgroundColor: "{colors.logo-red}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0 24px"
    height: "48px"
  button-bar-primary-hover:
    backgroundColor: "{colors.red-deep}"
  button-bar-small:
    rounded: "{rounded.none}"
    padding: "0 16px"
    height: "40px"
  pain-marker:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.logo-red}"
    rounded: "{rounded.none}"
    size: "32px"
  pain-marker-active:
    backgroundColor: "{colors.logo-red}"
    textColor: "{colors.paper}"
  step-square:
    backgroundColor: "{colors.logo-red}"
    textColor: "{colors.paper}"
    rounded: "{rounded.none}"
    size: "28px"
  document-tag:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "6px 12px"
  quote-sheet:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "16px 20px"
---

# Design System: Plasma Demos (Brobridge)

## Overview

**Creative North Star: "The Ruled Ledger"**

The demos live on Brobridge's paper: white ground, ink text, and one logo red. Structure comes from ink rules, not boxes. A 6px red rule caps the header, 2px ink rules separate narrative beats, a 6px ink rule opens a new chapter, and hairlines divide rows inside a block. Corners are square everywhere, including inside reused components that would otherwise round.

Red marks problems and the active state, never decoration. A pain is a red dashed flow and a red square marker. A solution is a solid ink line with red dots moving downstream. Large tabular numerals carry the count of each beat and the headline figure. The isometric diagram is drawn in warm paper greys so it reads as part of the page, not as an illustration placed on top of it.

Density is presentation-scale. Body copy sits at 17px with generous 1.75 leading, diagram labels never drop below about 17px on screen, and the same content must read from the back of a meeting room and on a 390px phone.

**Key Characteristics:**
- Paper white, ink #111, logo red as the only accent; no other hues in the UI layer.
- Square corners throughout (0px), enforced even on embedded components.
- Rules as structure: 6px red header rule, 6px ink chapter rule, 2px ink beat rule, 1px hairline row rule.
- Big tabular numerals as the voice of each beat.
- Problem = red dashed; solution = solid ink with moving red dots.
- One easing curve, cubic-bezier(0.16, 1, 0.3, 1), for every state change.

## Colors

A strict paper-and-ink palette with a single logo red that means "problem" or "here".

### Primary
- **Logo Red** (logo-red): the header top rule, the primary bar button, pain markers and their bubbles, dashed problem flows, moving solution dots, the active rail segment, active chapter underline, focus ring, selection, schema code snippets, and headline totals (812).
- **Deep Red** (red-deep): hover state of the primary bar button only.

### Neutral
- **Ink** (ink): all text, the 2px button borders, beat and chapter rules, solid solution lines, roster bars, the AI panel border and user bubble.
- **Paper** (paper): the page ground, and the fill behind diagram labels and document tags so they cut cleanly across lines.
- **Sheet** (sheet): quoted prompts, empty bar tracks in the roster, and inactive rail segments. The one tonal surface.
- **Hairline** (hairline): row dividers in schema lists, the comparison table and the roster; the separator beside the header crumb.
- **Muted Ink** (muted-ink): lead paragraphs, beat body text, sublabels, inactive chapter links, footnotes.
- **Iso Greys** (iso-left, iso-right, iso-line): the shaded side faces and outlines of isometric blocks; the top face is paper.

### Named Rules
**The One Red Rule.** Red is reserved for problems, the active state, and the primary call to action. If a red element is neither a pain, the current position, nor "contact us", it should be ink.

**The No-Green Rule.** Success is shown in ink, not green. Solved states use ink weight (`tone-ok` is ink at 600), never a status hue.

## Typography

**Display Font:** system sans (SF Pro Text / PingFang TC / Noto Sans TC / Microsoft JhengHei)
**Body Font:** the same system sans
**Label/Mono Font:** ui-monospace (SFMono-Regular, Menlo) for schema and table identifiers only

**Character:** One family at contrasting weights. Headings are semibold with slight negative tracking; numerals are bold, tight and tabular; everything else is regular weight with long leading for Traditional Chinese.

### Hierarchy
- **Display** (600, clamp(2.5rem, 3.8vw, 3.5rem), 1.08): chapter headings and the results title. 2.125rem below 1024px.
- **Numeral** (700, 5rem, 0.9, tabular): the beat number. Grey (#8a8a8a) at rest, red (pain) or ink (step) when its beat is active. 3.5rem below 1024px. Totals use the same face at 4 to 4.5rem in red.
- **Title** (600, 1.875rem, 1.25): beat titles. 1.5rem below 1024px.
- **Lead** (400, 1.1875rem, 1.75, muted): chapter intros and beat body, max 28 to 30em.
- **Body** (400, 1.0625rem, 1.75): base text, quotes, comparison table.
- **Label** (700, 0.9375rem, 0.02em): buttons, header crumb, schema row heads. Not uppercase.
- **Code** (mono, 0.9375rem, red): schema field names such as `NURSE_MST.NRS_NAME`.

### Named Rules
**The Numeral Voice Rule.** Each narrative beat opens with its number set large; the number, not a label above the heading, identifies the beat.

## Layout

Scrollytelling on a two-column grid: narrative at minmax(420px, 36%) on the left with a 1px ink right border, a sticky diagram filling the rest below the 71px header. Beats are at least 68vh tall and separated by 2px ink rules; a second chapter opens with a 6px ink rule. A thin vertical progress rail (4px wide segments, 6px gap) sits at the diagram's right edge: sheet for future, ink for past, red and taller for current.

The closing section runs full width (max 90rem, 88px / 40px padding) under a 6px ink rule, with a 1.4fr / 1fr grid (64px gap) for comparison table and roster.

Below 1024px the diagram pins under the header at 50svh (60svh in landscape) with a 2px ink bottom rule, and narrative scrolls beneath it with 20px side padding. Below 640px the comparison table restacks into labelled rows. Spacing steps observed: 8, 12, 16, 24, 40, 56, 88px, with 20, 32, 48, 64, 72 used for section-level gaps.

## Elevation & Depth

Flat. Depth comes from rules, the sheet tone, and the isometric drawing itself. The only shadow in the system belongs to the floating AI agent panel, which sits over the diagram: a soft, downward ambient shadow under a 2px ink border.

### Shadow Vocabulary
- **Floating panel** (`box-shadow: 0 24px 48px -24px rgb(17 17 17 / 0.35)`): only for a panel that overlays the pinned diagram.

### Named Rules
**The Ruled Not Raised Rule.** Separate content with ink rules and hairlines. Do not lift cards with shadows; the panel shadow is the single exception for an overlay.

## Shapes

Square corners everywhere (0px). Markers, step squares, document tags, buttons, rail segments and bars are all rectangles. Embedded components that ship with rounding are forced square (`[class*="rounded"] { border-radius: 0 }` inside the agent panel). Borders are ink: 2px for interactive and framing elements (buttons, markers, panel), 1px for tags and the header base, hairline for row dividers. Flow lines end in square caps.

## Components

### Buttons
Bar buttons: blunt, ink-framed, confident.
- **Shape:** square (0px), 48px tall, 2px border.
- **Default:** transparent with ink border and ink label (0.9375rem, 700).
- **Primary:** logo red fill and border, paper label; one per view, for contact.
- **Hover / Focus:** default inverts to ink fill with paper text; primary deepens to red-deep. 160ms on the system easing. Focus is a 2px red outline at 3px offset.
- **Small:** 40px tall, 16px side padding, used in the header. Pressed toggles (autoplay) show the inverted ink state.

### Chips (document tags)
- **Style:** paper fill, 1px ink border, 6px 12px padding, a 16px line icon before the text.

### Cards / Containers
- **Corner Style:** square.
- **Background:** paper; sheet for quoted prompts.
- **Shadow Strategy:** none, except the floating agent panel (see Elevation).
- **Border:** containers are mostly borderless, defined by rules above and hairlines below.
- **Internal Padding:** 16px 20px for the quote sheet.

### Navigation
- **Header:** sticky, 71px total: 6px red top rule, paper body, 1px ink bottom rule. Logo, a crumb behind a hairline separator, then chapter links.
- **Chapter links:** muted at rest, ink on hover, ink 700 with a 3px red underline sitting on the header rule when active.
- **Mobile:** crumb and key hints hide, chapter links tighten to 6 to 8px padding at 0.8125 to 0.875rem.

### Pain Marker (signature)
A 32px square, paper with a 2px red border and a red numeral. When its beat is active it fills red, the numeral turns paper, it scales 1.15, and a red bubble with paper text wipes in from the left (clip-path, 0.5s).

### Flow Lines (signature)
Problem flows are 2px red lines dashed 7/7 and marching. Solution flows are a 1.5px solid ink base with 5px red square dots travelling downstream. Both double in weight in the compact (phone) stage.

### Roster Bars
Ink bars on a 14px sheet track in a 5em / 1fr / 3em grid, hairline row dividers, tabular count at right, and a large red total.

## Do's and Don'ts

### Do:
- **Do** cap every page header with the 6px logo-red rule and close it with a 1px ink rule.
- **Do** separate narrative beats with 2px ink rules and open a chapter with a 6px ink rule.
- **Do** keep every corner square (0px), including inside reused third-party or legacy components.
- **Do** draw problems in red dashed lines with red square markers, and solutions in solid ink with moving red dots.
- **Do** use cubic-bezier(0.16, 1, 0.3, 1) for state transitions and stop looping flows under prefers-reduced-motion.
- **Do** label illustrative figures as demo data in muted footnote text.

### Don't:
- **Don't** introduce green, blue, or any second accent hue into the UI layer. Third-party database logos keep their own brand colors as identifiers, at label size.
- **Don't** round corners or use glass or blurred translucent panels.
- **Don't** add shadows to cards or buttons; only an overlay panel above the diagram may carry the soft panel shadow.
- **Don't** set any red element that is not a problem, the current position, or the contact action.

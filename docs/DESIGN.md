# Draftline design system

Original product: a lightweight user-flow canvas for developers, PMs, and small product teams. Voice: thoughtful, playful, specific, low pressure. Keep copy brief and human. Describe actual behavior rather than promising AI or cloud collaboration.

## Tokens

- Paper `#fffefb`, white `#ffffff`, ink `#171717`, muted copy `#77736d`, warm border/dot `#e6e3dc`.
- Orange marker `#d95b35`; reserve for underlines, active tools, and tiny labels.
- Diagram fills: peach `#f7dfc8`, lilac `#e7ddf6`, blue `#d9eafa`, green `#e0ead5`, yellow `#f6edb7`.
- Display: Caveat 600. Body/UI: Inter 400 and 600. Fonts are local in `public/assets/fonts/`.
- Large handwritten headings; precise compact controls and supporting text. Handwriting remains upright.
- Main content max-width 1180px; desktop horizontal gutters 40px minimum; mobile 18px.
- Canvas/card radii 20–22px, buttons 10–12px. One-pixel borders and restrained warm shadows.

## Layout and motion

Compact navigation, centered two-line hero, orange marked phrase, paired actions, interactive canvas, generous scroll pause, seven cards in a 2/3/2 grid, three original example journeys, closing invitation and quiet dotted footer. Product mockups represent the actual editor, not a fake operating-system window. Preserve whitespace around chapter transitions.

Use dots in the hero, canvas, feature illustration areas, CTA, and footer. Keep card copy and the main feature region quiet. Avoid gradients, glass effects, dark marketing panels, fabricated proof bars, and decorative infinite animations. Hover movement is 2–4px. Respect reduced motion.

On phones, collapse navigation, keep the actual diagram composition scrollable inside its own container, and stack feature cards in one column. Compact primary actions remain on a single line; the smallest screens stack hero actions. No horizontal page overflow.

## Source of truth

`../design/draftline.pen` was built on the Pencil canvas before PHP implementation. Use its hierarchy and these tokens for future additions. Application features and accessibility behaviors are implemented in PHP/JS and require separate code updates after design changes.

## Application additions

The ten numbered pages share a quiet header: brand, a small divider, Back/Forward/Refresh icons, and Workspace/Templates/Collections/More navigation. Keep page controls in the original navigation row. Phones use a compact menu rather than a separate browser-style toolbar.

Desktop content remains at 1180px maximum. Tablets use 32px gutters at 1024×768 and 768×1024; phones use 18px. At tablet portrait, draft/collection cards use two columns, previews stack above guidance, and presentation notes move below the stage. Landscape keeps previews beside guidance. Long web pages scroll naturally.

Sketch diagram labels all use Caveat 600, including decision questions. Clean diagram labels all use Inter 600. Approved? must match neighboring typography, remain on one line when it fits, and stay clear of the diagonal strokes. The shared font-aware layout is in public/assets/js/core.js. Do not add a separate decision-label font or a fixed text rectangle over the diamond.

Saved drafts are real local data. Do not seed fake names, dates, collections, notes or versions into an empty workspace. Four static templates are starting points, and Approval includes a real Yes/No branch and a return from Revise to Review.

Trash uses a reversible confirmation and 30-day retention. Permanent deletion has its own confirmation. Version restoration preserves history. Backup import previews counts and creates new copies rather than replacing existing flows.

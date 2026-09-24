# Accessibility

The baseline uses a declared language, semantic header/navigation/main/footer,
a single page heading, a keyboard-visible skip link, and visible focus outlines.
The main landmark is a programmatic focus target. The page remains usable without
JavaScript. There are no animations or custom controls in the baseline.

When extending the site:

- Keep heading levels meaningful and landmark names distinct where necessary.
- Use anchors for navigation and buttons for actions. Preserve keyboard behavior.
- Give every form control a persistent associated label and useful errors.
- Supply meaningful alternative text for informative images; use empty `alt` for
  decorative images. Do not hide focusable controls with visual-only utilities.
- Maintain WCAG AA text contrast (4.5:1 for ordinary text, 3:1 for large text) and
  adequate control/focus contrast. Do not convey meaning through color alone.
- Respect `prefers-reduced-motion` if adding motion; avoid unnecessary animation.
- For custom interactions, define keyboard behavior, accessible names and state,
  focus entry/exit, and dismissal before implementation.

Before publishing changed content, manually test keyboard order, skip navigation,
visible focus, zoom/reflow, narrow screens, and a screen reader. Check both pages
and any new controls. HTML/lint checks detect selected defects; they cannot certify
accessibility, content quality, or assistive-technology behavior.

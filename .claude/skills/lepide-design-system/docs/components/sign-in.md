---
title: Sign in
exports: [SignIn]
category: patterns
status: stable
summary: The whole sign-in page, exactly the prototype's — glass card with the form (email, password) and the illustration panel, where data particles form the Lepide mark and each module's icon, one slide each. Validation, loading and error states are built in.
classes: [login-page, stage, auth, card, screen, auth-eyebrow, auth-sub, field, row-label, input-icon, lead-ico, err-line, eye, btn, btn__icon, spinner, foot, auth__art, security-background, art__hint, art__copy, art__kicker, art__title, art__text, art__nav]
tokens: [--glass-strong, --brand, --surface, --ink, --ink-3, --danger-text]
related: [icon, text-field, button, ai-orb]
---

# Sign in

## When to use
- The product's sign-in page. It is a whole page: render it outside the console shell and outside any card.
- It is always the prototype's sign-in (https://lepide-with-new-design.vercel.app/login): use the component as it
  is, with its defaults. Don't redesign the panel or draw your own illustration.

## When not to use
- Re-authenticating inside the console (session expired, confirm with password): use a `Modal` with a `PasswordField`.
- Sign-up, password reset or one-time-code pages: build them from the same `.login-page` classes (see the static
  `examples/html/sign-in.html`); the component covers sign-in only.

## Anatomy
1. Page `.login-page` → `.stage` → `.auth`: a 1120 px glass card (`--glass-strong`, radius 32) in two halves.
2. Form half: `BrandMark` (52 px tile), eyebrow "Lepide · Data Security Platform" (`.auth-eyebrow`), title
   "Sign in to the console" 600 30/38 (`h1`), optional subtitle.
3. Fields: 48 px tall, radius 14, a leading 18 px icon (`.lead-ico`); the password has a show/hide eye button.
   "Forgot password?" sits on the label row when `forgotPasswordTo` is set.
4. A 50 px primary pill button with an arrow ("Keep me signed in" only with `showKeepSignedIn`; the prototype has none).
5. Footer "Need access? Ask an administrator.", or "New to Lepide? Request access" when `requestAccessTo` is set.
6. Illustration half `.auth__art` (radius 24, radial blue gradient): the prototype's particle animation
   (`@lepide/ds-css/art`). About a thousand data particles start scattered, form the Lepide mark, then re-form as each
   module's icon — Lepide AI, Auditor, Trust, Detect, Protect, Identify — with that slide's kicker, title and text below
   and progress dots that fill while a slide shows (≈5 s each). A hint at the top ("Move through the data to scatter
   it · click to jump ahead") fades once the pointer moves over the panel. The pointer scatters the particles near
   it (a scanner ring threads them); a click jumps to the next slide; the dots switch slides (arrow keys move between
   them). The slides default to the prototype's seven (`SIGN_IN_SLIDES`); `art` replaces the animation.

## Variants and sizes
One layout. Below 860 px the illustration panel hides and the form fills the card.

## States
| State | Change |
|---|---|
| Field error | Red border on the input and a message with an alert icon under it; the button shakes once; focus moves to the first invalid field |
| Loading | While `onSubmit`'s promise is pending: spinner, "Signing in…", `aria-busy`; further submits are ignored |
| Done | Promise resolved: check icon, "Signed in" |
| Failed | Promise rejected: the error's message under the password field ("Wrong email or password."), focus on the password |
| Reduced motion | The particles take each shape without moving; slides change only from the dots |
| Narrow (≤ 860 px) | The illustration panel hides |

## Accessibility
- Labels are real `<label for>`s; errors are linked with `aria-describedby` and announced (`role="alert"`).
- The eye button is `aria-pressed` and named "Show password" / "Hide password".
- `autocomplete="username"` and `"current-password"` let password managers fill the form.
- The canvas is `aria-hidden`; the slide caption is `aria-live="polite"`; each dot is a button named after its slide
  ("Lepide Auditor: Audit every change"), in a group named "How Lepide helps".

## Do and don't
| Do | Don't |
|---|---|
| Reject with a short, plain message: "Wrong email or password." | Say which of the two was wrong |
| Keep the default illustration and slides (the prototype's) | Draw your own panel: a dotted logo, rings, a static picture |
| Pass router paths to `forgotPasswordTo` / `requestAccessTo` (rendered through `LepideProvider`'s link) | Hard-code `<a>` tags that reload the app |

## Example
```tsx
import { SignIn } from '@lepide/ds-react';

<SignIn
  onSubmit={async ({ email, password }) => {
    const ok = await api.signIn(email, password);
    if (!ok) throw new Error('Wrong email or password.');
  }}
  forgotPasswordTo="/forgot-password"
/>
```

Plain HTML: copy `examples/html/sign-in.html` (`get_example("sign-in", "html")`). Keep its `.auth__art` markup
(canvas, hint, empty caption and dots) and load `lepide.js` and `lepide-art.js` (from `@lepide/ds-css`, or the hosted
`https://lepide-new-ds.vercel.app/ds/lepide.js` and `https://lepide-new-ds.vercel.app/ds/lepide-art.js`): the script draws the animation and fills the caption and dots.

## Props
<!-- props:start -->
<!-- Generated by docs/build.mjs from the TypeScript source — do not edit by hand. -->

### `SignIn`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `onSubmit` * | `(values: SignInValues) => void \| Promise<void>` | — | Called with valid input. Return a promise to show the loading state; reject (or throw) an Error to show its message under the password field. Resolving shows "Signed in". |
| `eyebrow` | `string` | `'Lepide · Data Security Platform'` |  |
| `title` | `string` | `'Sign in to the console'` |  |
| `subtitle` | `ReactNode` | — |  |
| `forgotPasswordTo` | `string` | — | Link for "Forgot password?" (rendered through LepideProvider's link). Omit to hide it. |
| `requestAccessTo` | `string` | — | Link for "Request access" in the footer. Omit to show "Need access? Ask an administrator." (the prototype). |
| `slides` | `SignInSlide[]` | — | Slides on the illustration panel. Omit for the prototype's seven (`SIGN_IN_SLIDES`). |
| `art` | `ReactNode` | — | Replaces the particle animation with your own (static) illustration; `slides` then switch with the dots only. |
| `showKeepSignedIn` | `boolean` | `false` | Show a "Keep me signed in" checkbox (the prototype has none). |
| `defaultKeepSignedIn` | `boolean` | `true` | Initial state of "Keep me signed in". |

### Types

```ts
// import type { SignInSlide } from '@lepide/ds-react'
type SignInSlide = { kicker: string; title: string; text: string; shape?: LoginArtShape };
// import type { SignInValues } from '@lepide/ds-react'
type SignInValues = { email: string; password: string; keepSignedIn: boolean };
```

`*` required.
<!-- props:end -->

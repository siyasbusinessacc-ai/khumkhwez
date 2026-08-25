# Swap in the Maniac Lounge logo everywhere

Replace the current Khumkhwez logo with the uploaded Maniac Lounge logo across the whole app, in one place so every screen updates at once.

## What changes visually

- Auth page, password reset page, student dashboard header, referral page, profile page, kitchen dashboard, admin dashboard, and the sidebar all show the new logo.
- The browser tab icon (favicon) becomes the new logo.
- Because the new logo is a wide horizontal mark (not square like the old one), the logo component switches to width-based sizing so it never looks squashed or cropped. Existing size settings on each screen are adjusted so the mark stays balanced in tight spots (sidebar, small page headers).
- The "symbol" variant no longer has a separate square icon, so it will render the same mark, scaled smaller.

## What stays the same

- Brand text on screens (for example "Khumkhwez", "Khumkhwez Now") and page titles are left as they are. Say the word if you want those renamed to Maniac Lounge and I'll update the copy, metadata, and tests too.
- Colors, layout, and all app behaviour stay unchanged.

## Technical notes

- Upload the PNG as a CDN asset pointer (`src/assets/maniac-lounge-logo.png.asset.json`) and reference its URL in `src/components/Logo.tsx`; remove the old `khumkhwez-logo.png` / `logo-symbol.png` imports and delete the unused files.
- `Logo.tsx`: keep the `size`/`variant` props, but map size to width with `height: auto` and `object-contain`, preserving the amber glow drop-shadow.
- Update the asset mock in `src/test/student-dashboard.test.tsx` to the new module path so the suite still passes; run tests after the swap.
- Favicon: write a padded square 64x64 `public/favicon.png`, point `index.html` at it, and remove `public/favicon.ico`.

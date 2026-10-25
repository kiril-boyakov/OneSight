# OneSight

Portfolio and website design/development services website. Built with static HTML, CSS and JavaScript, with no build dependencies.

## Local preview

Run `python3 -m http.server 4173 --directory dist` from this repository, then open http://localhost:4173. Use a local server so root-relative links and assets resolve correctly.

## Editing

- Homepage: `dist/index.html`
- Portfolio: `dist/work/index.html`
- Styling: `dist/style.css`, `dist/refined.css`, `dist/portfolio.css`, `dist/motion.css`
- Interactions: `dist/app.js`, `dist/motion.js`
- Images and branding: `dist/assets/`, `dist/favicon.svg`, `dist/social.svg`

Serve `dist` as the web root on a static host. No install or build command is needed. This repository stores source; it does not automatically deploy to GitHub Pages or update the existing Sites preview.

## Current state and launch checklist

- The portfolio includes OneSight and the completed Osti redesign, with Osti's official logo and live website link.
- WhatsApp is connected to +32 465 91 83 50. Email remains a placeholder.
- The inquiry form is a preview. It does not send or store submissions or claim successful delivery. Connect a server-side delivery/storage service, validation and spam protection before using it for inquiries.
- Integrated review submission and owner moderation are implemented. Follow `REVIEW_SETUP.md` to activate Supabase storage and the owner account; the public form stays disabled until storage is available. Only approved reviews are displayed. The dashboard is at `/admin/`.
- Confirm service area and business policies before adding location claims, structured business data or commitments.
- Review privacy information to reflect the actual inquiry provider and retention policy.
- Keep preview indexing restrictions until public launch is approved. For launch, set canonical and social URLs to the final domain, update robots directives and `robots.txt`, generate an XML sitemap and add verified structured data where appropriate.
- Export the social SVG to a social-card-compatible image and verify sharing previews before launch.
- Check responsive layouts, keyboard navigation, contrast, links, reduced-motion behavior and actual inquiry delivery before launch.

## Domain and search setup

Hosting, domain registration and inquiry delivery are separate services. Choose a host whose current plan supports commercial use and the required form integration. Add a custom domain in that host, copy its DNS records to the registrar and wait for HTTPS validation. Update production metadata and the sitemap. Verify the domain in Google Search Console using its DNS TXT record, then submit the sitemap.

# PodToolbox Deployment Folder

This folder contains the deployment handoff files for moving PodToolbox to DigitalOcean App Platform and pointing `podtoolbox.net` away from GoDaddy Website Builder.

Files:

- `digitalocean-app.yaml` — DigitalOcean App Platform spec for a static React/Vite site.
- `godaddy-dns-checklist.md` — DNS and Website Builder disconnect checklist for GoDaddy.

DigitalOcean is configured to use:

```yaml
repo: mildsdixon/podtoolbox
```

The site builds with:

```bash
npm run build
```

and publishes the `dist` folder.

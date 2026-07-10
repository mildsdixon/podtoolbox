# PodToolbox Deployment Folder

This folder contains the deployment handoff files for moving PodToolbox to DigitalOcean App Platform and pointing `podtoolbox.net` away from GoDaddy Website Builder.

Created resources:

- GitHub repo: `https://github.com/mildsdixon/podtoolbox`
- DigitalOcean app: `podtoolbox`
- DigitalOcean app ID: `db2d0337-c5d0-4f73-bb08-8220d4c20344`
- Source commit: `1ab0e0430adf2297fa21d46501eed40336f3c886`

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

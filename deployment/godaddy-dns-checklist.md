# PodToolbox GoDaddy DNS Checklist

Current DNS check:

- `podtoolbox.net` points to `160.153.0.46`, which is GoDaddy Website Builder hosting.
- `www.podtoolbox.net` currently follows `podtoolbox.net`.
- Nameservers are `ns43.domaincontrol.com` and `ns44.domaincontrol.com`, so DNS is managed inside GoDaddy.

DigitalOcean app created:

- App name: `podtoolbox`
- App ID: `db2d0337-c5d0-4f73-bb08-8220d4c20344`
- GitHub source: `https://github.com/mildsdixon/podtoolbox`

## Disconnect GoDaddy Website Builder

1. Sign in to GoDaddy.
2. Open **Domain Portfolio**.
3. Select `podtoolbox.net`.
4. Open **DNS**.
5. If GoDaddy shows a connected template above the DNS table, choose **Remove** next to the template and confirm.
6. In **Websites + Marketing**, open the existing website and choose **Unpublish** if you no longer want Website Builder serving content.

## Point The Domain To DigitalOcean App Platform

After the PodToolbox app exists in DigitalOcean:

1. In DigitalOcean, open **Apps**.
2. Select the `podtoolbox` app.
3. Open **Networking**.
4. Add `podtoolbox.net`.
5. Choose **You manage your domain**.
6. Copy the A record values that DigitalOcean provides for the apex/root domain.
7. In GoDaddy DNS, replace the existing `A` record for `@` that points to `160.153.0.46` with DigitalOcean's provided A record value or values.
8. Add or edit `www` as a `CNAME` pointing to the DigitalOcean `ondigitalocean.app` target.
9. Wait for DNS and SSL validation to complete in DigitalOcean.

Do not delete MX records unless you intentionally want to change email hosting.

# EAS builds — preview channel

`eas.json` defines three profiles. `preview` is the one to use for anything
that isn't a store release: internal distribution, an installable `.apk` on
Android and a device build on iOS, published to the `preview` channel so
`eas update --branch preview` can push JS updates to it afterwards.

```bash
cd apps/mobile
npx eas-cli login                      # Julien's Expo account
npx eas-cli init                       # once — writes extra.eas.projectId into app.json
npx eas-cli build --profile preview --platform all
```

## The one thing that will silently break a cloud build

`services/supabase.ts` reads `EXPO_PUBLIC_SUPABASE_URL` and
`EXPO_PUBLIC_SUPABASE_ANON_KEY`, and Expo **inlines those at build time**.
`apps/mobile/.env` is gitignored (correctly — see `.env.example`), so an EAS
cloud build has no copy of it. The build succeeds, and the installed app shows
"Sign-in isn't configured yet" on the auth screen with no other symptom.

So set them as EAS environment variables first, once per environment:

```bash
npx eas-cli env:create --environment preview \
  --name EXPO_PUBLIC_SUPABASE_URL --value https://hexoluuqagxhplrgfsme.supabase.co --visibility plaintext
npx eas-cli env:create --environment preview \
  --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value '<anon key from Settings > API>' --visibility plaintext
```

`plaintext` is right for both: they are public client credentials by design
(`EXPO_PUBLIC_*` ends up in the shipped bundle either way, and the anon key is
only as powerful as the RLS policies allow — CDC §127). The **service role**
key must never appear here, in `.env`, or anywhere in `apps/mobile`.

`environment` in each build profile is what binds a build to that set.

## Before the first preview build reaches a device

- `winterarc://auth/callback` and `winterarc://auth/reset` have to be
  registered under Auth → URL Configuration → Redirect URLs in the Supabase
  dashboard, or Google sign-in and password recovery dead-end in the browser.
- Google sign-in additionally needs an OAuth client wired into
  Auth → Providers → Google.

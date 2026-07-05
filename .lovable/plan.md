## Create a test account for you to sign in

You're on the `/auth` page now. I'll create a ready-to-use test account in the backend so you can sign in immediately and click through the app.

### Credentials (I'll create these)
- **Email:** `tester@landing-strategy-ai.app`
- **Password:** `TestUser!2026`

### Steps
1. Use the backend Auth Admin API to create the user with `email_confirm: true` (so no email verification is required).
2. Verify the user exists.
3. Hand you the credentials — sign in at `/auth` (use the "Sign in" tab, not "Create account").

### Notes
- On first sign-in, the app will route you to `/app/brand/new` to create a workspace, then into the normal flow.
- If you'd rather use your own email/password, tell me the values (or just an email and I'll set a password) and I'll seed that instead.

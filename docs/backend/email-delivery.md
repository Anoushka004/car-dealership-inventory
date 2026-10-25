## Decision

### First-release scope and delivery
- The first deployed release is an approved-tester demo, not a public email rollout. Customer self-registration is limited to an approved list of tester email addresses. Those testers receive password-reset links in their own real inboxes.
- The deployed backend sends password-reset email through Twilio SendGrid's SMTP relay. Verify the owner's existing mailbox as a Single Sender and use that same address as the From address. No sender domain is available or planned for this demo.
- Configure SendGrid SMTP with a Mail Send API key held in deployment secrets, never in source control. The exact sender address and tester allowlist are deployment configuration.
- Local development sends to Mailpit's local capture inbox; it does not send real mail. The email transport differs by environment while the reset flow remains the same.
- The reset-link behavior from [Define accounts and admin access](https://github.com/Anoushka004/car-dealership-inventory/issues/3) remains: a single-use link expires after 30 minutes, and completing a reset revokes all refresh sessions.

### Failure and readiness
- Reset requests return the same generic outward response whether the account exists or sending fails, to avoid revealing account membership. Record send failures for an operator alert without logging the reset token or full link. After a delivery failure is corrected, the tester can request a fresh link.
- Before the deployed demo is considered ready, confirm that a real reset link reaches each approved tester's inbox and that the full reset succeeds. A successful SMTP submission alone is insufficient. If mail does not arrive, the demo is not ready until the sender or delivery approach is fixed.
- Accept SendGrid's current free-trial boundary (listed as 100 messages per day for 60 days). If sending is needed beyond the trial, use a paid plan or make a new delivery decision. Public production sending would require a separate authenticated-domain and delivery decision.

### Provider constraints checked on 2026-10-25
- [SendGrid SMTP integration](https://www.twilio.com/docs/sendgrid/for-developers/sending-email/integrating-with-the-smtp-api) documents `smtp.sendgrid.net`, API-key authentication, and port 587.
- [SendGrid single-sender guidance](https://www.twilio.com/docs/sendgrid/for-developers/sending-email/sender-identity) treats single-sender verification as a testing approach; [SendGrid's free-mail warning](https://help.twilio.com/articles/47453602998171) notes that addresses from major free mailbox providers may be filtered or rejected.
- [SendGrid pricing](https://www.twilio.com/en-us/products/email-api/pricing) lists the current trial limit; [Mailpit](https://github.com/axllent/mailpit) captures development emails locally; [OWASP's reset guidance](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html) supports consistent reset responses.


﻿## Decision

### Accounts and permissions
- Visitors browse and search without an account. Customers self-register with a unique email address and password; email uniqueness is case-insensitive.
- Customers can purchase vehicle options, view their own account and orders, and cannot manage listings. Admins can add, edit, delete, and restock listings and options and view all orders. Purchase actions are customer-only. The rules for who may cancel an order belong to [Define purchase, cancellation, and stock rules](https://github.com/Anoushka004/car-dealership-inventory/issues/4).
- Admins use the same login flow as customers. A trusted deployment command creates admin accounts. Public registration cannot choose an admin role, and there is no API to promote an account in the first release.
- Email verification and admin MFA are deferred from the first release.

### Tokens and sessions
- Login issues a signed JWT bearer access token valid for 15 minutes and a renewable seven-day refresh session.
- The refresh token is opaque, rotated on use, stored server-side as a verifier, and delivered to the browser in a Secure, HttpOnly cookie. The frontend keeps the access token in memory rather than browser storage.
- Allow simultaneous device sessions. Logout revokes the current refresh session; "log out everywhere" revokes all of the account's refresh sessions. Already-issued access tokens expire within 15 minutes.

### Password reset
- A customer requests a single-use password-reset link by email. The link expires after 30 minutes. Completing a reset revokes all refresh sessions for that account.
- Email delivery is required for this first-release flow; provider selection is a separate planning decision.

### Security baseline for the implementation
- Store passwords using Argon2id rather than plaintext or a fast hash.
- Validate JWT signature, configured algorithm, issuer, audience, and expiration. Enforce roles on protected API operations.
- Protect login and reset requests from automated abuse; reset requests return the same outward response whether an email exists. Protect cookie-based refresh endpoints against cross-site requests.

Primary guidance:
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [OWASP Forgot Password Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)
- [OWASP REST Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html)


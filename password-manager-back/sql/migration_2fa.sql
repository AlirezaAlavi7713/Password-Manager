-- Migration : ajout du 2FA TOTP
ALTER TABLE users
  ADD COLUMN totp_secret  VARCHAR(64) DEFAULT NULL,
  ADD COLUMN totp_enabled BOOLEAN     DEFAULT FALSE;

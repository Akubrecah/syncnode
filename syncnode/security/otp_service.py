import os
import time
import secrets
from typing import Optional, Dict, Any
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

import httpx
import aiosmtplib
import phonenumbers
from phonenumbers import PhoneNumberFormat, NumberParseException

from syncnode.common.logger import Logger
from syncnode.common.errors import ValidationError

logger = Logger("OTPService")


def format_and_validate_phone(phone_str: str, default_region: str = "US") -> Dict[str, Any]:
    """
    Validates and formats an international phone number using open-source phonenumbers.
    Returns E.164 formatted string and metadata.
    """
    if not phone_str or not phone_str.strip():
        return {
            "valid": False,
            "e164": "",
            "formatted": "",
            "region": "",
            "error": "Phone number cannot be empty"
        }

    raw = phone_str.strip()
    try:
        parsed = phonenumbers.parse(raw, default_region.upper() if default_region else "US")
        if not phonenumbers.is_valid_number(parsed):
            return {
                "valid": False,
                "e164": "",
                "formatted": raw,
                "region": default_region,
                "error": "Invalid international phone number structure"
            }

        e164 = phonenumbers.format_number(parsed, PhoneNumberFormat.E164)
        international = phonenumbers.format_number(parsed, PhoneNumberFormat.INTERNATIONAL)
        region = phonenumbers.region_code_for_number(parsed)

        return {
            "valid": True,
            "e164": e164,
            "formatted": international,
            "country_code": parsed.country_code,
            "region": region,
            "error": None
        }
    except NumberParseException as e:
        return {
            "valid": False,
            "e164": "",
            "formatted": raw,
            "region": default_region,
            "error": f"Failed to parse phone number: {e._msg}"
        }


class OpenSourceOTPService:
    """
    100% Open-Source OTP Service:
    - Asynchronous SMTP delivery via aiosmtplib
    - Open-source SMS Gateway / Webhook dispatcher
    - Phone number validation via Google libphonenumber (phonenumbers)
    - In-memory rate-limited store with replay & brute-force protection
    """

    def __init__(self):
        # identifier -> { code, expires_at, purpose, attempts, last_sent_at }
        self._store: Dict[str, Dict[str, Any]] = {}
        self.max_attempts = 5
        self.ttl_seconds = 600  # 10 minutes
        self.resend_cooldown_seconds = 45  # 45s between resends

    def generate_code(self, length: int = 6) -> str:
        """Generates a cryptographically random numeric OTP code."""
        lower_bound = 10 ** (length - 1)
        upper_bound = 10 ** length - 1
        return str(secrets.randbelow(upper_bound - lower_bound + 1) + lower_bound)

    def _build_email_html(self, code: str, purpose: str = "VERIFICATION") -> str:
        """Renders an institutional dark-themed HTML email matching CryptoBridge design tokens."""
        return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verification Code - Syncnode</title>
</head>
<body style="margin:0; padding:24px 0; background-color:#0b0e11; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color:#eaecef;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td align="center">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:500px; background-color:#181a20; border:1px solid #2b313a; border-radius:10px; overflow:hidden; padding:28px 24px;">
          <tr>
            <td style="padding-bottom:20px; border-bottom:1px solid #23272e;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="left">
                    <span style="display:inline-block; width:28px; height:28px; border-radius:6px; background-color:rgba(252, 213, 53, 0.15); border:1px solid #fcd535; text-align:center; line-height:28px; color:#fcd535; font-weight:800; font-size:16px;">S</span>
                    <span style="font-size:18px; font-weight:800; color:#ffffff; margin-left:8px; vertical-align:middle;">SYNCNODE</span>
                    <span style="font-size:10px; font-weight:700; color:#fcd535; background:rgba(252,213,53,0.12); padding:2px 6px; border-radius:4px; margin-left:6px; vertical-align:middle;">SECURITY</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding-top:24px;">
              <h2 style="font-size:18px; font-weight:700; color:#ffffff; margin:0 0 12px;">{purpose.title()} Verification Code</h2>
              <p style="font-size:13.5px; line-height:1.55; color:#848e9c; margin:0 0 20px;">
                Use the following 6-digit One-Time Password (OTP) to complete your account registration on Syncnode. This code is valid for 10 minutes.
              </p>
              <div style="background-color:#0b0e11; border:1px solid #2b313a; border-radius:8px; padding:18px; text-align:center; margin:0 0 20px;">
                <span style="font-family:'JetBrains Mono', monospace, Courier; font-size:32px; font-weight:800; letter-spacing:8px; color:#fcd535;">{code}</span>
              </div>
              <p style="font-size:12px; color:#5e6673; line-height:1.5; margin:0;">
                If you did not initiate this registration or verification request, please ignore this email. Never share your one-time verification codes with anyone.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-top:24px; border-top:1px solid #23272e; margin-top:24px; text-align:center; font-size:11px; color:#5e6673;">
              © 2026 Syncnode Enterprise Exchange. All rights reserved.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

    async def send_email_otp(self, email: str, code: str, purpose: str = "VERIFICATION") -> bool:
        """
        Sends OTP email using open-source standard SMTP (aiosmtplib).
        Falls back to structured terminal output if SMTP server is not configured.
        """
        smtp_host = os.environ.get("SMTP_HOST")
        smtp_port = int(os.environ.get("SMTP_PORT", "587"))
        smtp_user = os.environ.get("SMTP_USER")
        smtp_pass = os.environ.get("SMTP_PASSWORD")
        smtp_from = os.environ.get("SMTP_FROM", "Syncnode Auth <no-reply@syncnode.exchange>")
        use_tls = os.environ.get("SMTP_USE_TLS", "true").lower() in ("true", "1", "yes")

        if smtp_host:
            try:
                msg = MIMEMultipart("alternative")
                msg["Subject"] = f"[{code}] Your Syncnode {purpose.title()} Code"
                msg["From"] = smtp_from
                msg["To"] = email

                plain_text = f"Your Syncnode {purpose} code is: {code}\nThis code is valid for 10 minutes."
                html_text = self._build_email_html(code, purpose)

                msg.attach(MIMEText(plain_text, "plain"))
                msg.attach(MIMEText(html_text, "html"))

                await aiosmtplib.send(
                    msg,
                    hostname=smtp_host,
                    port=smtp_port,
                    username=smtp_user,
                    password=smtp_pass,
                    start_tls=use_tls
                )
                logger.info(f"Dispatched SMTP OTP email to {email}")
                return True
            except Exception as e:
                logger.error(f"SMTP sending failed to {email}: {e}. Falling back to dev logger.")

        # Open-Source Dev/Local Fallback Logger
        print(f"\n=======================================================")
        print(f"📧 [OPEN-SOURCE DEV EMAIL OTP DISPATCH]")
        print(f"To: {email}")
        print(f"Purpose: {purpose}")
        print(f"OTP Code: {code} (Valid for 10 minutes)")
        print(f"=======================================================\n")
        logger.info(f"Dev Email OTP for {email}: {code}")
        return True

    async def send_sms_otp(self, phone_e164: str, code: str, purpose: str = "VERIFICATION") -> bool:
        """
        Sends SMS OTP via configurable Open-Source SMS Gateway webhook/REST API
        (e.g., Traccar SMS Gateway, Kannel, Gammu, or any HTTP SMS provider).
        Falls back to structured terminal output in dev mode.
        """
        gateway_url = os.environ.get("SMS_GATEWAY_URL")
        gateway_token = os.environ.get("SMS_GATEWAY_TOKEN")

        message_body = f"Syncnode: Your {purpose.lower()} verification code is {code}. Valid for 10 minutes. Do not share this code."

        if gateway_url:
            try:
                headers = {"Content-Type": "application/json"}
                if gateway_token:
                    headers["Authorization"] = f"Bearer {gateway_token}"

                payload = {
                    "to": phone_e164,
                    "message": message_body,
                    "code": code,
                    "purpose": purpose
                }

                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.post(gateway_url, json=payload, headers=headers)
                    if resp.status_code < 400:
                        logger.info(f"Dispatched SMS OTP via gateway to {phone_e164}")
                        return True
                    else:
                        logger.error(f"SMS Gateway returned HTTP {resp.status_code}: {resp.text}")
            except Exception as e:
                logger.error(f"Failed to dispatch SMS via gateway: {e}")

        # Open-Source Dev/Local Fallback Logger
        print(f"\n=======================================================")
        print(f"📱 [OPEN-SOURCE DEV SMS OTP DISPATCH]")
        print(f"To: {phone_e164}")
        print(f"Purpose: {purpose}")
        print(f"Message: {message_body}")
        print(f"OTP Code: {code} (Valid for 10 minutes)")
        print(f"=======================================================\n")
        logger.info(f"Dev SMS OTP for {phone_e164}: {code}")
        return True

    async def request_otp(self, identifier: str, channel: str = "email", purpose: str = "REGISTRATION", default_region: str = "US") -> Dict[str, Any]:
        """
        Creates and dispatches an OTP code to an email or phone number.
        Enforces cooldown and replay limits.
        """
        now = time.time()
        key = identifier.strip().lower()

        # Check Resend Cooldown
        existing = self._store.get(key)
        if existing and (now - existing.get("last_sent_at", 0)) < self.resend_cooldown_seconds:
            remaining = int(self.resend_cooldown_seconds - (now - existing.get("last_sent_at", 0)))
            raise ValidationError(f"Please wait {remaining} seconds before requesting a new code.")

        code = self.generate_code(6)
        expires_at = now + self.ttl_seconds

        self._store[key] = {
            "code": code,
            "expires_at": expires_at,
            "purpose": purpose,
            "attempts": 0,
            "last_sent_at": now,
            "channel": channel,
            "created_at": now
        }

        # Dispatch based on channel
        if channel == "sms" or (channel == "auto" and not "@" in key):
            phone_info = format_and_validate_phone(key, default_region=default_region)
            if not phone_info["valid"]:
                raise ValidationError(phone_info.get("error") or "Invalid phone number")
            target_e164 = phone_info["e164"]
            # Store also under formatted E.164
            self._store[target_e164] = self._store[key]
            await self.send_sms_otp(target_e164, code, purpose=purpose)
            return {
                "success": True,
                "channel": "sms",
                "target": phone_info["formatted"],
                "expiresInSeconds": self.ttl_seconds,
                "cooldownSeconds": self.resend_cooldown_seconds,
                "otp": code  # Dev convenience
            }
        else:
            if "@" not in key or len(key) < 5:
                raise ValidationError("Invalid email address provided")
            await self.send_email_otp(key, code, purpose=purpose)
            return {
                "success": True,
                "channel": "email",
                "target": key,
                "expiresInSeconds": self.ttl_seconds,
                "cooldownSeconds": self.resend_cooldown_seconds,
                "otp": code  # Dev convenience
            }

    def verify_otp(self, identifier: str, code: str, consume: bool = True) -> bool:
        """
        Validates OTP code against store with attempt limits and expiration check.
        """
        key = identifier.strip().lower()
        entry = self._store.get(key)

        # Fallback check for E.164 if phone format differed
        if not entry and not "@" in key:
            phone_info = format_and_validate_phone(key)
            if phone_info["valid"]:
                entry = self._store.get(phone_info["e164"])

        if not entry:
            raise ValidationError("No verification code found or code expired. Please request a new one.")

        if time.time() > entry["expires_at"]:
            self._store.pop(key, None)
            raise ValidationError("Verification code has expired. Please request a new code.")

        if entry["attempts"] >= self.max_attempts:
            self._store.pop(key, None)
            raise ValidationError("Too many failed attempts. This code is invalidated. Request a new code.")

        if entry["code"] != code.strip():
            entry["attempts"] += 1
            remaining = self.max_attempts - entry["attempts"]
            raise ValidationError(f"Invalid verification code. {remaining} attempts remaining.")

        if consume:
            self._store.pop(key, None)

        return True


otp_service = OpenSourceOTPService()

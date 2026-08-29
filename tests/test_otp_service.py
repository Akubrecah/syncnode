import pytest
from syncnode.security.otp_service import OpenSourceOTPService, format_and_validate_phone
from syncnode.common.errors import ValidationError


def test_phone_validation_valid():
    # US number
    res = format_and_validate_phone("+14155552671", "US")
    assert res["valid"] is True
    assert res["e164"] == "+14155552671"
    assert res["country_code"] == 1

    # UK number
    res_uk = format_and_validate_phone("+447911123456", "GB")
    assert res_uk["valid"] is True
    assert res_uk["e164"] == "+447911123456"

    # Australia local number with default region AU
    res_au = format_and_validate_phone("0412345678", "AU")
    assert res_au["valid"] is True
    assert res_au["e164"] == "+61412345678"


def test_phone_validation_invalid():
    res_empty = format_and_validate_phone("", "US")
    assert res_empty["valid"] is False

    res_invalid = format_and_validate_phone("12345", "US")
    assert res_invalid["valid"] is False

    res_letters = format_and_validate_phone("abc-invalid", "US")
    assert res_letters["valid"] is False


@pytest.mark.asyncio
async def test_otp_service_email_lifecycle():
    svc = OpenSourceOTPService()
    email = "trader@syncnode.exchange"

    # 1. Request OTP
    req = await svc.request_otp(email, channel="email", purpose="REGISTRATION")
    assert req["success"] is True
    assert req["channel"] == "email"
    assert len(req["otp"]) == 6

    code = req["otp"]

    # 2. Cooldown rejection
    with pytest.raises(ValidationError) as exc:
        await svc.request_otp(email, channel="email")
    assert "Please wait" in str(exc.value)

    # 3. Invalid code attempt
    with pytest.raises(ValidationError) as exc:
        svc.verify_otp(email, "000000", consume=False)
    assert "Invalid verification code" in str(exc.value)

    # 4. Valid code verification
    assert svc.verify_otp(email, code, consume=True) is True

    # 5. Consumed code cannot be reused
    with pytest.raises(ValidationError) as exc:
        svc.verify_otp(email, code, consume=True)
    assert "No verification code found" in str(exc.value)


@pytest.mark.asyncio
async def test_otp_service_sms_lifecycle():
    svc = OpenSourceOTPService()
    phone = "+14155552671"

    # 1. Request SMS OTP
    req = await svc.request_otp(phone, channel="sms", purpose="REGISTRATION")
    assert req["success"] is True
    assert req["channel"] == "sms"
    assert len(req["otp"]) == 6

    code = req["otp"]

    # 2. Valid code verification
    assert svc.verify_otp(phone, code, consume=True) is True


@pytest.mark.asyncio
async def test_otp_service_brute_force_protection():
    svc = OpenSourceOTPService()
    email = "target@syncnode.exchange"

    req = await svc.request_otp(email, channel="email")
    # Make 5 incorrect attempts
    for _ in range(5):
        try:
            svc.verify_otp(email, "999999", consume=False)
        except ValidationError:
            pass

    # 6th attempt should invalidate code
    with pytest.raises(ValidationError) as exc:
        svc.verify_otp(email, req["otp"], consume=True)
    assert "Too many failed attempts" in str(exc.value) or "No verification code found" in str(exc.value)

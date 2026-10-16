"""tts_ab_cut1.super_admin_credentials / login 의 계정 선택 회귀 테스트. 실제 값 없는 합성 fixture 만 쓴다.

사용: python -m unittest scripts/media/minerock600-pilot/ep01/test_tts_accounts.py
"""
import os
import sys
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent))
import tts_ab_cut1 as tts  # noqa: E402

PASSWORD_TABLE = """# TEST ACCOUNTS (local only)

## 1. 이메일 · 비밀번호 계정

| 용도 | 아이디 | 비밀번호 | 로그인 방식 | 확인 상태 |
| --- | --- | --- | --- | --- |
| 매장 경영자 | store@example.test | fixture-store-pw | 이메일 | 미확인 |
{rows}
## 2. Google 로그인 계정

| 용도 | 아이디 | 로그인 방식 | 확인 상태 |
| --- | --- | --- | --- |
| Neture 관리자 (super_admin) | google-admin@example.test | Google | - |
"""
ADMIN_ROW = "| Neture 관리자 (super_admin) | admin@example.test | fixture-admin-pw | 이메일 | 미확인 |"


def doc(*rows):
    return PASSWORD_TABLE.format(rows="\n".join(rows) + ("\n" if rows else ""))


class SuperAdminCredentials(unittest.TestCase):
    def assertRejects(self, text, pattern):
        with self.assertRaisesRegex(tts.AccountsError, pattern) as ctx:
            tts.super_admin_credentials(text)
        self.assertNotIn("fixture-", str(ctx.exception))
        self.assertNotIn("@example.test", str(ctx.exception))

    def test_selects_the_single_password_super_admin_row(self):
        self.assertEqual(tts.super_admin_credentials(doc(ADMIN_ROW)), ("admin@example.test", "fixture-admin-pw"))
        quoted = "| super_admin | `admin@example.test` | `fixture-admin-pw` | 이메일 | 미확인 |"
        self.assertEqual(tts.super_admin_credentials(doc(quoted)), ("admin@example.test", "fixture-admin-pw"))

    def test_column_order_follows_the_header(self):
        text = "| 비밀번호 | 확인 상태 | 아이디 | 용도 |\n|:---|---|---:|---|\n| fixture-admin-pw | - | admin@example.test | super_admin |\n"
        self.assertEqual(tts.super_admin_credentials(text), ("admin@example.test", "fixture-admin-pw"))

    def test_google_only_admin_is_not_a_password_account(self):
        # 실제 SSOT 형태: 관리자는 비밀번호 열이 없는 Google 표에만 있다.
        self.assertRejects(doc(), "super_admin 행 없음.*O4O_ACCESS_TOKEN")

    def test_missing_required_values(self):
        self.assertRejects(doc("| super_admin | admin@example.test |  | 이메일 | 미확인 |"), "비밀번호가 비었")
        self.assertRejects(doc("| super_admin | admin@example.test | - | 이메일 | 미확인 |"), "비밀번호가 비었")
        self.assertRejects(doc("| super_admin |  | fixture-admin-pw | 이메일 | 미확인 |"), "아이디가 비었")
        self.assertRejects(doc("| super_admin | not-an-email | fixture-admin-pw | 이메일 | 미확인 |"), "이메일 형식")
        self.assertRejects("| 용도 | 아이디 |\n| --- | --- |\n| super_admin | admin@example.test |\n", "계정 표 없음")
        self.assertRejects(doc("| super_admin | admin@example.test | fixture-admin-pw |"), "열 수")

    def test_ambiguous_duplicates_are_rejected_instead_of_taking_the_first(self):
        second = "| super_admin (예비) | other@example.test | fixture-other-pw | 이메일 | 미확인 |"
        self.assertRejects(doc(ADMIN_ROW, second), "2개")

    def test_wrong_roles_are_not_selected(self):
        for role in ["Neture 관리자 (admin)", "운영자 (operator)", "super_admin_viewer", "not_super_admin", "superadmin"]:
            with self.subTest(role=role):
                self.assertRejects(doc(f"| {role} | admin@example.test | fixture-admin-pw | 이메일 | 미확인 |"), "행 없음")
        # 용도가 아닌 열에 적힌 super_admin 은 역할이 아니다.
        self.assertRejects(doc("| 매장 | admin@example.test | fixture-admin-pw | 이메일 | super_admin 확인 예정 |"), "행 없음")


class Login(unittest.TestCase):
    def test_access_token_wins_without_reading_accounts_or_calling_login(self):
        with mock.patch.dict(os.environ, {"O4O_ACCESS_TOKEN": "fixture-token"}), \
                mock.patch.object(tts, "ACCOUNTS", Path("does-not-exist.local.md")), \
                mock.patch.object(tts, "post", side_effect=AssertionError("no login call")):
            self.assertEqual(tts.login("https://api.invalid/api/v1"), "fixture-token")

    def test_unusable_accounts_file_exits_before_any_login_call_and_without_values(self):
        env = {k: v for k, v in os.environ.items() if k != "O4O_ACCESS_TOKEN"}
        with mock.patch.dict(os.environ, env, clear=True), \
                mock.patch.object(tts, "post", side_effect=AssertionError("no login call")):
            for accounts in [Path("does-not-exist.local.md"), None]:
                with self.subTest(accounts=accounts):
                    target = accounts
                    if accounts is None:
                        target = mock.Mock(spec=Path)
                        target.name = "TEST-ACCOUNTS.local.md"
                        target.read_text.return_value = doc()
                    with mock.patch.object(tts, "ACCOUNTS", target), self.assertRaises(SystemExit) as ctx:
                        tts.login("https://api.invalid/api/v1")
                    self.assertNotIn("@example.test", str(ctx.exception.code))


if __name__ == "__main__":
    unittest.main()

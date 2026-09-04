import copy
import sys
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

import app as app_module


class AdminModeTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app_module.app)
        self.original_activities = copy.deepcopy(app_module.activities)
        self.original_sessions = copy.deepcopy(app_module.active_sessions)

    def tearDown(self):
        app_module.activities = copy.deepcopy(self.original_activities)
        app_module.active_sessions = copy.deepcopy(self.original_sessions)

    def test_admin_login_authenticates_valid_teacher(self):
        response = self.client.post(
            "/admin/login",
            json={"username": "teacher1", "password": "password123"},
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("token", payload)
        self.assertEqual(payload["username"], "teacher1")

    def test_admin_login_rejects_bad_credentials(self):
        response = self.client.post(
            "/admin/login",
            json={"username": "teacher1", "password": "wrong-password"},
        )

        self.assertEqual(response.status_code, 401)

    def test_signup_requires_teacher_login(self):
        response = self.client.post(
            "/activities/Chess Club/signup?email=student@example.com"
        )

        self.assertEqual(response.status_code, 401)

    def test_teacher_can_sign_up_student(self):
        login_response = self.client.post(
            "/admin/login",
            json={"username": "teacher1", "password": "password123"},
        )
        token = login_response.json()["token"]

        response = self.client.post(
            "/activities/Chess Club/signup?email=student@example.com",
            headers={"Authorization": f"Bearer {token}"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn("student@example.com", app_module.activities["Chess Club"]["participants"])


if __name__ == "__main__":
    unittest.main()

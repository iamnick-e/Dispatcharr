"""
Tests for Phase 1 multi-account pooling models:
  - AccountPool
  - AccountPoolMembership
  - StreamAssignment
"""

from django.test import TestCase
from django.db import IntegrityError
from django.utils import timezone

from apps.m3u.models import (
    AccountPool,
    AccountPoolMembership,
    M3UAccount,
    StreamAssignment,
)
from apps.channels.models import StreamProfile


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def make_account(name="Test Account", max_streams=2):
    """Create a minimal M3UAccount for testing."""
    profile, _ = StreamProfile.objects.get_or_create(
        name="Test Profile",
        defaults={"command": "", "parameters": ""},
    )
    account = M3UAccount.objects.create(
        name=name,
        max_streams=max_streams,
        stream_profile=profile,
    )
    return account


def make_pool(name="Test Pool", strategy=AccountPool.Strategy.ROUND_ROBIN):
    """Create a minimal AccountPool for testing."""
    return AccountPool.objects.create(
        name=name,
        description="A pool for testing",
        provider="TestProvider",
        strategy=strategy,
        max_streams_per_account=1,
        enabled=True,
    )


# ---------------------------------------------------------------------------
# AccountPool tests
# ---------------------------------------------------------------------------


class AccountPoolModelTest(TestCase):
    def test_create_pool_with_defaults(self):
        pool = AccountPool.objects.create(name="My Pool")
        self.assertEqual(pool.name, "My Pool")
        self.assertEqual(pool.strategy, AccountPool.Strategy.ROUND_ROBIN)
        self.assertEqual(pool.max_streams_per_account, 1)
        self.assertTrue(pool.enabled)
        self.assertEqual(pool.description, "")
        self.assertEqual(pool.provider, "")
        self.assertIsNotNone(pool.created_at)
        self.assertIsNotNone(pool.updated_at)

    def test_all_strategies_valid(self):
        for strategy, _ in AccountPool.Strategy.choices:
            pool = AccountPool.objects.create(
                name=f"Pool-{strategy}", strategy=strategy
            )
            self.assertEqual(pool.strategy, strategy)

    def test_name_must_be_unique(self):
        AccountPool.objects.create(name="Unique Pool")
        with self.assertRaises(IntegrityError):
            AccountPool.objects.create(name="Unique Pool")

    def test_str_representation(self):
        pool = make_pool(strategy=AccountPool.Strategy.LEAST_USED)
        self.assertIn("Least Used", str(pool))
        self.assertIn("Test Pool", str(pool))

    def test_disabled_pool(self):
        pool = AccountPool.objects.create(name="Disabled Pool", enabled=False)
        self.assertFalse(pool.enabled)

    def test_active_accounts_empty_when_no_members(self):
        pool = make_pool()
        self.assertEqual(pool.active_accounts().count(), 0)

    def test_active_accounts_returns_active_members_only(self):
        pool = make_pool()
        acc1 = make_account("Acc1")
        acc2 = make_account("Acc2")
        acc_inactive = make_account("AccInactive")
        acc_inactive.is_active = False
        acc_inactive.save()

        AccountPoolMembership.objects.create(pool=pool, account=acc1)
        AccountPoolMembership.objects.create(pool=pool, account=acc2)
        AccountPoolMembership.objects.create(pool=pool, account=acc_inactive)

        active = pool.active_accounts()
        self.assertIn(acc1, active)
        self.assertIn(acc2, active)
        self.assertNotIn(acc_inactive, active)


# ---------------------------------------------------------------------------
# AccountPoolMembership tests
# ---------------------------------------------------------------------------


class AccountPoolMembershipTest(TestCase):
    def setUp(self):
        self.pool = make_pool()
        self.account = make_account()

    def test_create_membership(self):
        membership = AccountPoolMembership.objects.create(
            pool=self.pool, account=self.account, priority=5
        )
        self.assertEqual(membership.pool, self.pool)
        self.assertEqual(membership.account, self.account)
        self.assertEqual(membership.priority, 5)
        self.assertIsNotNone(membership.added_at)

    def test_default_priority_is_zero(self):
        membership = AccountPoolMembership.objects.create(
            pool=self.pool, account=self.account
        )
        self.assertEqual(membership.priority, 0)

    def test_unique_together_pool_account(self):
        AccountPoolMembership.objects.create(pool=self.pool, account=self.account)
        with self.assertRaises(IntegrityError):
            AccountPoolMembership.objects.create(pool=self.pool, account=self.account)

    def test_account_can_join_multiple_pools(self):
        pool2 = make_pool(name="Second Pool")
        AccountPoolMembership.objects.create(pool=self.pool, account=self.account)
        m2 = AccountPoolMembership.objects.create(pool=pool2, account=self.account)
        self.assertEqual(m2.account, self.account)

    def test_str_representation(self):
        membership = AccountPoolMembership.objects.create(
            pool=self.pool, account=self.account, priority=3
        )
        s = str(membership)
        self.assertIn(self.account.name, s)
        self.assertIn(self.pool.name, s)
        self.assertIn("3", s)

    def test_pool_memberships_related_name(self):
        AccountPoolMembership.objects.create(pool=self.pool, account=self.account)
        self.assertEqual(self.pool.memberships.count(), 1)
        self.assertEqual(self.account.pool_memberships.count(), 1)

    def test_cascade_delete_pool_removes_memberships(self):
        AccountPoolMembership.objects.create(pool=self.pool, account=self.account)
        pool_id = self.pool.pk
        self.pool.delete()
        self.assertEqual(
            AccountPoolMembership.objects.filter(pool_id=pool_id).count(), 0
        )

    def test_cascade_delete_account_removes_memberships(self):
        AccountPoolMembership.objects.create(pool=self.pool, account=self.account)
        account_id = self.account.pk
        self.account.delete()
        self.assertEqual(
            AccountPoolMembership.objects.filter(account_id=account_id).count(), 0
        )

    def test_ordering_by_priority_then_added_at(self):
        acc2 = make_account("Acc2")
        acc3 = make_account("Acc3")
        pool2 = make_pool("Pool2")
        m_low = AccountPoolMembership.objects.create(
            pool=pool2, account=self.account, priority=10
        )
        m_high = AccountPoolMembership.objects.create(
            pool=pool2, account=acc2, priority=1
        )
        m_mid = AccountPoolMembership.objects.create(
            pool=pool2, account=acc3, priority=5
        )
        qs = list(pool2.memberships.all())
        self.assertEqual(qs[0], m_high)
        self.assertEqual(qs[1], m_mid)
        self.assertEqual(qs[2], m_low)


# ---------------------------------------------------------------------------
# StreamAssignment tests
# ---------------------------------------------------------------------------


class StreamAssignmentTest(TestCase):
    def setUp(self):
        self.pool = make_pool()
        self.account = make_account()

    def test_create_assignment(self):
        assignment = StreamAssignment.objects.create(
            pool=self.pool,
            account=self.account,
            stream_id="channel-42",
        )
        self.assertEqual(assignment.pool, self.pool)
        self.assertEqual(assignment.account, self.account)
        self.assertEqual(assignment.stream_id, "channel-42")
        self.assertTrue(assignment.active)
        self.assertIsNone(assignment.released_at)
        self.assertIsNotNone(assignment.assigned_at)

    def test_str_active(self):
        a = StreamAssignment.objects.create(
            pool=self.pool, account=self.account, stream_id="ch-1"
        )
        self.assertIn("active", str(a))
        self.assertIn("ch-1", str(a))

    def test_str_released(self):
        a = StreamAssignment.objects.create(
            pool=self.pool, account=self.account, stream_id="ch-2", active=False
        )
        self.assertIn("released", str(a))

    def test_release_method(self):
        assignment = StreamAssignment.objects.create(
            pool=self.pool,
            account=self.account,
            stream_id="ch-99",
        )
        self.assertTrue(assignment.active)
        assignment.release()

        assignment.refresh_from_db()
        self.assertFalse(assignment.active)
        self.assertIsNotNone(assignment.released_at)
        self.assertLessEqual(assignment.released_at, timezone.now())

    def test_multiple_assignments_for_same_account(self):
        """An account can have many concurrent stream assignments."""
        StreamAssignment.objects.create(
            pool=self.pool, account=self.account, stream_id="ch-1"
        )
        StreamAssignment.objects.create(
            pool=self.pool, account=self.account, stream_id="ch-2"
        )
        self.assertEqual(
            StreamAssignment.objects.filter(account=self.account, active=True).count(),
            2,
        )

    def test_cascade_delete_pool_removes_assignments(self):
        StreamAssignment.objects.create(
            pool=self.pool, account=self.account, stream_id="ch-3"
        )
        pool_id = self.pool.pk
        self.pool.delete()
        self.assertEqual(
            StreamAssignment.objects.filter(pool_id=pool_id).count(), 0
        )

    def test_cascade_delete_account_removes_assignments(self):
        StreamAssignment.objects.create(
            pool=self.pool, account=self.account, stream_id="ch-4"
        )
        account_id = self.account.pk
        self.account.delete()
        self.assertEqual(
            StreamAssignment.objects.filter(account_id=account_id).count(), 0
        )

    def test_active_index_filters_correctly(self):
        StreamAssignment.objects.create(
            pool=self.pool, account=self.account, stream_id="active-ch"
        )
        released = StreamAssignment.objects.create(
            pool=self.pool, account=self.account, stream_id="released-ch"
        )
        released.release()

        active_qs = StreamAssignment.objects.filter(pool=self.pool, active=True)
        self.assertEqual(active_qs.count(), 1)
        self.assertEqual(active_qs.first().stream_id, "active-ch")

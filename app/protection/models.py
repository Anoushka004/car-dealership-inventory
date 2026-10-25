from django.db import models
from django.db.models import F, Q

from app.protection.registry import BUDGETS


class ProtectionConfiguration(models.Model):
    id = models.PositiveSmallIntegerField(primary_key=True, default=1, editable=False)
    namespace = models.CharField(max_length=64)
    registry_version = models.PositiveIntegerField()
    registry_digest = models.CharField(max_length=64)
    key_fingerprint = models.CharField(max_length=64)

    class Meta:
        constraints = [
            models.CheckConstraint(condition=Q(id=1), name="one_protection_configuration")
        ]


class ProtectionBucket(models.Model):
    pk = models.CompositePrimaryKey("namespace", "group", "owner_kind", "owner_digest")
    namespace = models.CharField(max_length=64)
    group = models.CharField(max_length=64)
    owner_kind = models.CharField(max_length=16)
    owner_digest = models.CharField(max_length=64)
    capacity = models.PositiveIntegerField()
    interval_us = models.BigIntegerField()
    credit_us = models.BigIntegerField()
    last_refill_us = models.BigIntegerField()

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=Q(owner_digest__regex=r"^[a-f0-9]{64}$"), name="bucket_digest_format"
            ),
            models.CheckConstraint(
                condition=Q(credit_us__gte=0) & Q(credit_us__lte=F("capacity") * F("interval_us")),
                name="bucket_credit_bounds",
            ),
            models.CheckConstraint(
                condition=Q(last_refill_us__gte=0), name="bucket_refill_timestamp"
            ),
            models.CheckConstraint(
                condition=Q.create(
                    [
                        Q(
                            group=group,
                            capacity=budget.capacity,
                            interval_us=budget.interval_us,
                            owner_kind=budget.owner_kind,
                        )
                        for group, budget in BUDGETS.items()
                    ],
                    connector=Q.OR,
                ),
                name="bucket_approved_budget",
            ),
        ]


class OperationGuard(models.Model):
    pk = models.CompositePrimaryKey("namespace", "operation_kind", "owner_digest")
    namespace = models.CharField(max_length=64)
    operation_kind = models.CharField(max_length=16)
    owner_digest = models.CharField(max_length=64)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=Q(operation_kind__in=["login", "refresh", "reset"]),
                name="guard_operation_kind",
            ),
            models.CheckConstraint(
                condition=Q(owner_digest__regex=r"^[a-f0-9]{64}$"), name="guard_digest_format"
            ),
        ]

from django.core.management.base import BaseCommand, CommandError
from django.db import connection, transaction
from psycopg import sql

from app.protection.configuration import expected_configuration, verify_protection_configuration
from app.protection.models import OperationGuard, ProtectionBucket, ProtectionConfiguration


class Command(BaseCommand):
    help = (
        "Initialize protection configuration before serving traffic; never replace existing state."
    )

    def add_arguments(self, parser):
        parser.add_argument("--runtime-role", required=True)

    def handle(self, *args, **options):
        try:
            expected = expected_configuration()
            with transaction.atomic():
                ProtectionConfiguration.objects.get_or_create(pk=1, defaults=expected)
                verify_protection_configuration()
                with connection.cursor() as cursor:
                    role = sql.Identifier(options["runtime_role"])
                    cursor.execute(sql.SQL("GRANT USAGE ON SCHEMA public TO {}").format(role))
                    cursor.execute(
                        sql.SQL("GRANT SELECT ON TABLE {} TO {}").format(
                            sql.Identifier(ProtectionConfiguration._meta.db_table), role
                        )
                    )
                    for model in (ProtectionBucket, OperationGuard):
                        cursor.execute(
                            sql.SQL("GRANT SELECT, INSERT, UPDATE ON TABLE {} TO {}").format(
                                sql.Identifier(model._meta.db_table), role
                            )
                        )
        except Exception as exc:
            raise CommandError(
                "Protection setup failed; verify configuration and administrative permissions."
            ) from exc
        self.stdout.write(
            self.style.SUCCESS("Protection configuration verified; runtime grants applied.")
        )

import os
import sys

if __name__ == "__main__":
    if not os.environ.get("MIGRATION_DATABASE_URL"):
        raise SystemExit("MIGRATION_DATABASE_URL is required for management commands.")
    os.environ["DEALERSHIP_MANAGEMENT"] = "1"
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "app.django_settings")
    from django.core.management import execute_from_command_line

    execute_from_command_line(sys.argv)

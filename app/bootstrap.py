import os

import django
from django.apps import apps


def initialize_django():
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "app.django_settings")
    if not apps.ready:
        django.setup()

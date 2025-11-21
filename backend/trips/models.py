from django.db import models
from django.contrib.postgres.fields import JSONField

try:
    # Django 3.1+ has JSONField
    from django.db.models import JSONField as BuiltinJSONField
    JSON_FIELD = BuiltinJSONField
except Exception:
    JSON_FIELD = JSONField


class Trip(models.Model):
    start_address = models.CharField(max_length=255, blank=True)
    pickup_address = models.CharField(max_length=255, blank=True)
    dropoff_address = models.CharField(max_length=255, blank=True)

    # explicit lat/lng fields (stored as floats)
    start_lat = models.FloatField(null=True, blank=True)
    start_lng = models.FloatField(null=True, blank=True)
    pickup_lat = models.FloatField(null=True, blank=True)
    pickup_lng = models.FloatField(null=True, blank=True)
    dropoff_lat = models.FloatField(null=True, blank=True)
    dropoff_lng = models.FloatField(null=True, blank=True)

    # legacy JSON coords (optional) and route
    start_coords = JSON_FIELD(null=True, blank=True)
    pickup_coords = JSON_FIELD(null=True, blank=True)
    dropoff_coords = JSON_FIELD(null=True, blank=True)
    route_geojson = JSON_FIELD(null=True, blank=True)
    current_cycle_hours = models.FloatField(default=0.0)
    start_datetime = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Trip {self.id} {self.start_address} -> {self.dropoff_address}"

    def save(self, *args, **kwargs):
        # keep JSON coords in sync for backward compatibility
        if self.start_lat is not None and self.start_lng is not None:
            self.start_coords = [self.start_lat, self.start_lng]
        if self.pickup_lat is not None and self.pickup_lng is not None:
            self.pickup_coords = [self.pickup_lat, self.pickup_lng]
        if self.dropoff_lat is not None and self.dropoff_lng is not None:
            self.dropoff_coords = [self.dropoff_lat, self.dropoff_lng]
        super().save(*args, **kwargs)

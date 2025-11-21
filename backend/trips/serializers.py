from rest_framework import serializers
from .models import Trip


class TripSerializer(serializers.ModelSerializer):
    # expose lat/lng fields and computed coords in [lat, lng] order for the Trip model
    start_lat = serializers.FloatField(required=False, allow_null=True)
    start_lng = serializers.FloatField(required=False, allow_null=True)
    pickup_lat = serializers.FloatField(required=False, allow_null=True)
    pickup_lng = serializers.FloatField(required=False, allow_null=True)
    dropoff_lat = serializers.FloatField(required=False, allow_null=True)
    dropoff_lng = serializers.FloatField(required=False, allow_null=True)

    # accept start_coords input as [lat, lng]
    start_coords = serializers.ListField(child=serializers.FloatField(), required=False, allow_null=True)
    pickup_coords = serializers.ListField(child=serializers.FloatField(), required=False, allow_null=True)
    dropoff_coords = serializers.ListField(child=serializers.FloatField(), required=False, allow_null=True)

    class Meta:
        model = Trip
        fields = [
            'id',
            'start_address', 'pickup_address', 'dropoff_address',
            'start_lat', 'start_lng', 'pickup_lat', 'pickup_lng', 'dropoff_lat', 'dropoff_lng',
            'start_coords', 'pickup_coords', 'dropoff_coords',
            'route_geojson', 'current_cycle_hours', 'start_datetime',
        ]

    def create(self, validated_data):
        # normalize coordinate arrays if provided as [lat, lng]
        def pop_coords(prefix):
            key = f"{prefix}_coords"
            if key in validated_data and validated_data.get(key):
                v = validated_data.pop(key)
                # expect [lat, lng]
                try:
                    lat = float(v[0])
                    lng = float(v[1])
                except Exception:
                    return
                validated_data[f"{prefix}_lat"] = lat
                validated_data[f"{prefix}_lng"] = lng

        pop_coords('start')
        pop_coords('pickup')
        pop_coords('dropoff')

        # allow direct lat/lng fields to be saved as well
        trip = super().create(validated_data)
        return trip

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # compute trip model coords as [lat, lng]
        data['start_coords'] = [instance.start_lat, instance.start_lng] if instance.start_lat is not None and instance.start_lng is not None else None
        data['pickup_coords'] = [instance.pickup_lat, instance.pickup_lng] if instance.pickup_lat is not None and instance.pickup_lng is not None else None
        data['dropoff_coords'] = [instance.dropoff_lat, instance.dropoff_lng] if instance.dropoff_lat is not None and instance.dropoff_lng is not None else None
        return data

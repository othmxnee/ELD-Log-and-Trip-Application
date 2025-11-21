from django.core.management.base import BaseCommand
from trips.models import Trip


class Command(BaseCommand):
    help = 'Clean up 2-point fallback routes from the database, forcing them to re-fetch from ORS'

    def handle(self, *args, **options):
        """
        Find all trips with 2-point fallback geometry and set route_geojson to None.
        This forces them to re-fetch the full route from ORS on next access.
        """
        cleaned_count = 0
        total_with_routes = 0
        
        # Query all trips that have route_geojson
        trips_with_routes = Trip.objects.exclude(route_geojson__isnull=True)
        total_with_routes = trips_with_routes.count()
        
        self.stdout.write(f"Found {total_with_routes} trips with route_geojson")
        
        for trip in trips_with_routes:
            geom = trip.route_geojson.get('geometry', {})
            coords = geom.get('coordinates', [])
            
            if len(coords) == 2:
                # This is a 2-point fallback route
                self.stdout.write(
                    self.style.WARNING(
                        f"Trip {trip.id}: Clearing 2-point fallback route "
                        f"({trip.start_address} -> {trip.dropoff_address})"
                    )
                )
                trip.route_geojson = None
                trip.save()
                cleaned_count += 1
            else:
                # Valid ORS route, keep it
                self.stdout.write(
                    self.style.SUCCESS(
                        f"Trip {trip.id}: Valid route with {len(coords)} points - keeping"
                    )
                )
        
        self.stdout.write(
            self.style.SUCCESS(
                f"\n✅ Cleanup complete: Cleared {cleaned_count} fallback routes "
                f"out of {total_with_routes} total trips with routes"
            )
        )
        
        if cleaned_count > 0:
            self.stdout.write(
                self.style.NOTICE(
                    f"\nℹ️  The {cleaned_count} affected trip(s) will automatically "
                    "fetch full ORS routes on next access."
                )
            )

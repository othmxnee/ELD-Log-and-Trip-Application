from django.test import TestCase
from datetime import datetime
import pytz
from trips.hos import simulate_trip
from django.test import Client
from .models import Trip
from unittest.mock import patch, Mock
import os

class HOSLogicTests(TestCase):
    def test_simple_no_violation(self):
        # 4h drive, 1h off, 4h drive -> no violation
        s = datetime(2025,11,20,8,0,0,tzinfo=pytz.UTC)
        legs = [{'duration_s':4*3600}, {'duration_s':4*3600}]
        res = simulate_trip(s, legs, current_cycle_hours=0)
        # expect pages and driving segments present
        self.assertTrue('pages' in res)
        total_driving = 0
        for p in res['pages']:
            for seg in p['segments']:
                if seg['status']=='driving':
                    start = datetime.fromisoformat(seg['start'])
                    end = datetime.fromisoformat(seg['end'])
                    total_driving += (end - start).total_seconds()
        self.assertEqual(total_driving, 8*3600)

    def test_12_hour_continuous_drive_violation(self):
        s = datetime(2025,11,20,6,0,0,tzinfo=pytz.UTC)
        legs = [{'duration_s':12*3600}]
        res = simulate_trip(s, legs, current_cycle_hours=0)
        # should have at least one driving segment tagged violation True (because >11h)
        found_violation = False
        reasons = set()
        for p in res['pages']:
            for seg in p['segments']:
                if seg.get('violation'):
                    found_violation = True
                    if seg.get('violation_reason'):
                        reasons.add(seg.get('violation_reason'))
        self.assertTrue(found_violation)
        self.assertIn('11h_daily_drive_exceeded', reasons)

    def test_cycle_hours_consumption(self):
        s = datetime(2025,11,20,8,0,0,tzinfo=pytz.UTC)
        # Use current_cycle_hours close to limit
        legs = [{'duration_s':8*3600}, {'duration_s':8*3600}, {'duration_s':8*3600}]
        res = simulate_trip(s, legs, current_cycle_hours=60)
        # cycle_hours_remaining should not be negative
        self.assertGreaterEqual(res['cycle_hours_remaining'], 0)

    def test_route_view_uses_ors_when_available(self):
        # create a trip with start and dropoff
        trip = Trip.objects.create(start_lat=40.0, start_lng=-105.0, dropoff_lat=39.0, dropoff_lng=-104.0)
        client = Client()

        # prepare fake ORS geojson response
        fake_geom = {
            'type': 'LineString',
            'coordinates': [[-105.0, 40.0], [-104.5, 39.5], [-104.0, 39.0]]
        }
        fake_feature = {
            'type': 'Feature',
            'geometry': fake_geom,
            'properties': {
                'segments': [{ 'distance': 100000, 'duration': 3600 }],
                'summary': {'distance': 100000, 'duration': 3600}
            }
        }
        fake_resp = {'type': 'FeatureCollection', 'features': [fake_feature]}

        mock_resp = Mock()
        mock_resp.raise_for_status = Mock()
        mock_resp.json = Mock(return_value=fake_resp)

        with patch('requests.post', return_value=mock_resp) as mock_post:
            # ensure env key is present
            os.environ['ORS_API_KEY'] = 'test-key'
            resp = client.get(f'/api/trips/{trip.pk}/route/')
            self.assertEqual(resp.status_code, 200)
            data = resp.json()
            # geometry should be geojson with >2 coords
            self.assertIn('geometry', data)
            coords = data['geometry'].get('coordinates')
            self.assertTrue(isinstance(coords, list) and len(coords) > 2)
            # legs should be present
            self.assertIn('legs', data)
            # verify we called ORS endpoint
            mock_post.assert_called()

    def test_render_log_returns_pdf_for_valid_base64(self):
        # create trip
        trip = Trip.objects.create(start_lat=40.0, start_lng=-105.0, dropoff_lat=39.0, dropoff_lng=-104.0)
        client = Client()
        # 1x1 PNG base64 (small white pixel)
        one_px_png_b64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII='
        payload = {'pages': [{'image_b64': f'data:image/png;base64,{one_px_png_b64}'}]}
        resp = client.post(f'/api/trips/{trip.pk}/render-log/', data=payload, content_type='application/json')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp['Content-Type'], 'application/pdf')
        self.assertGreater(len(resp.content), 2000)

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.generics import RetrieveAPIView, ListCreateAPIView
from django.shortcuts import get_object_or_404
from .models import Trip
from .serializers import TripSerializer
from .hos import simulate_trip
import os
import requests
import logging
from base64 import b64decode
import binascii
from io import BytesIO
from django.http import HttpResponse
from reportlab.pdfgen import canvas as rl_canvas
from reportlab.lib.utils import ImageReader
from PIL import Image, ImageOps
from requests.exceptions import RequestException

logger = logging.getLogger(__name__)


def _build_fallback_geometry_from_trip(trip):
    """
    Build a simple LineString geojson from trip lat/lng fields.
    Returns geometry dict {'type':'LineString','coordinates': [[lon,lat],...]}
    """
    coords = []
    try:
        if trip.start_lng is not None and trip.start_lat is not None:
            coords.append([float(trip.start_lng), float(trip.start_lat)])
        if trip.pickup_lng is not None and trip.pickup_lat is not None:
            coords.append([float(trip.pickup_lng), float(trip.pickup_lat)])
        if trip.dropoff_lng is not None and trip.dropoff_lat is not None:
            coords.append([float(trip.dropoff_lng), float(trip.dropoff_lat)])
    except Exception:
        coords = []

    # ensure at least start->dropoff if available
    if len(coords) < 2 and trip.start_lng is not None and trip.dropoff_lng is not None:
        coords = [[float(trip.start_lng), float(trip.start_lat)],
                  [float(trip.dropoff_lng), float(trip.dropoff_lat)]]

    return {"type": "LineString", "coordinates": coords}


def _make_leg_from_geometry(geometry, summary=None, start_iso=None):
    """
    Create a fallback legs list from geometry (GeoJSON coords [lon,lat]).
    summary can contain duration/distance.
    """
    legs = []
    coords = geometry.get("coordinates", []) if geometry else []
    if not coords:
        return legs
    if summary and ("duration" in summary or "distance" in summary):
        legs.append({
            "start": start_iso,
            "duration_s": int(summary.get("duration", 0)),
            "distance_m": int(summary.get("distance", 0)),
            "start_coords": coords[0],
            "end_coords": coords[-1],
        })
    else:
        legs.append({
            "start": start_iso,
            "duration_s": 0,
            "distance_m": 0,
            "start_coords": coords[0],
            "end_coords": coords[-1],
        })
    return legs


class TripListCreateView(ListCreateAPIView):
    """List existing trips (GET) and create a new trip (POST)."""
    queryset = Trip.objects.all().order_by('-id')
    serializer_class = TripSerializer


class TripRouteView(APIView):
    """
    GET /api/trips/<pk>/route/
    Attempt to call ORS (prefer heigit then api.openrouteservice.org) with coordinates
    in [lon,lat] order. Save trip.route_geojson on success; fall back to straight line.
    Returns a dict: {geometry: GeoJSON, legs: [...], summary: {...}}
    """

    def get(self, request, pk):
        trip = get_object_or_404(Trip, pk=pk)

        # Check if we have a valid route (not a 2-point fallback)
        if trip.route_geojson:
            geom = trip.route_geojson.get('geometry', {})
            coords = geom.get('coordinates', [])
            # If we have more than 2 points, it's a real ORS route - return it
            if len(coords) > 2:
                logger.info("Returning cached route for trip %s with %d points", pk, len(coords))
                return Response(trip.route_geojson)
            else:
                # 2-point geometry is a fallback - re-fetch from ORS
                logger.info("Trip %s has 2-point fallback route, re-fetching from ORS", pk)

        # Build coords_for_ors as [[lon,lat], ...] from trip lat/lng fields
        coords_for_ors = []
        try:
            if trip.start_lng is not None and trip.start_lat is not None:
                coords_for_ors.append([float(trip.start_lng), float(trip.start_lat)])
            if trip.pickup_lng is not None and trip.pickup_lat is not None:
                coords_for_ors.append([float(trip.pickup_lng), float(trip.pickup_lat)])
            if trip.dropoff_lng is not None and trip.dropoff_lat is not None:
                coords_for_ors.append([float(trip.dropoff_lng), float(trip.dropoff_lat)])
        except Exception as e:
            logger.warning("Invalid trip coordinates for trip %s: %s", trip.pk, e)
            coords_for_ors = []

        ORS_KEY = os.environ.get("ORS_API_KEY") or None

        geometry = None
        legs = []
        summary_out = {"total_duration_s": 0, "total_distance_m": 0}

        # Try ORS if key present and at least 2 coordinates
        if ORS_KEY and len(coords_for_ors) >= 2:
            urls_to_try = [
                "https://api.openrouteservice.heigit.org/v2/directions/driving-car/geojson",
                "https://api.openrouteservice.org/v2/directions/driving-car/geojson"
            ]
            succeeded = False
            tried = []
            for url in urls_to_try:
                tried.append(url)
                try:
                    logger.info("Calling ORS (%s) for trip %s coords=%s", url, trip.pk, coords_for_ors)
                    payload = {"coordinates": coords_for_ors, "format": "geojson"}
                    headers = {"Authorization": ORS_KEY, "Content-Type": "application/json"}
                    resp = requests.post(url, json=payload, headers=headers, timeout=30)
                    logger.info("ORS response status=%s for trip=%s url=%s", resp.status_code, trip.pk, url)
                    resp.raise_for_status()
                    data = resp.json()
                    features = data.get("features") or []
                    if not features:
                        logger.warning("ORS returned no features for trip %s url=%s", trip.pk, url)
                        continue
                    feat = features[0]
                    geometry = feat.get("geometry")
                    props = feat.get("properties", {})
                    geom_coords = geometry.get("coordinates", []) if geometry else []
                    logger.info("ORS returned %d geometry points for trip %s (url=%s)", len(geom_coords), trip.pk, url)

                    # Build legs using segments if present
                    segments = props.get("segments") or []
                    if segments and isinstance(segments, list) and len(segments) > 0:
                        legs = []
                        coord_index = 0
                        total_coords = len(geom_coords)
                        seg_count = max(1, len(segments))
                        # rough estimate of coords-per-segment
                        est_len = max(1, int(total_coords / seg_count))
                        for seg in segments:
                            duration = seg.get("duration", 0)
                            distance = seg.get("distance", 0)
                            # attempt to use step way_points if available for start index
                            start_coords = None
                            end_coords = None
                            steps = seg.get("steps") or []
                            if steps and isinstance(steps, list) and len(steps) > 0:
                                first_wp = None
                                last_wp = None
                                try:
                                    # gather first and last way_points from steps
                                    first_wp = steps[0].get("way_points", [None, None])[0]
                                    last_wp = steps[-1].get("way_points", [None, None])[-1]
                                except Exception:
                                    first_wp = None
                                    last_wp = None
                                if isinstance(first_wp, int) and 0 <= first_wp < total_coords:
                                    lon_s, lat_s = geom_coords[first_wp]
                                    start_coords = [lon_s, lat_s]
                                if isinstance(last_wp, int) and 0 <= last_wp < total_coords:
                                    lon_e, lat_e = geom_coords[last_wp]
                                    end_coords = [lon_e, lat_e]
                            # fallback start/end based on coord_index/est_len
                            if not start_coords:
                                if coord_index < total_coords:
                                    lon_s, lat_s = geom_coords[coord_index]
                                    start_coords = [lon_s, lat_s]
                            end_idx = min(total_coords - 1, coord_index + est_len - 1)
                            if not end_coords:
                                lon_e, lat_e = geom_coords[end_idx]
                                end_coords = [lon_e, lat_e]
                            legs.append({
                                "start": trip.start_datetime.isoformat() if trip.start_datetime else None,
                                "duration_s": int(duration),
                                "distance_m": int(distance),
                                "start_coords": start_coords,
                                "end_coords": end_coords,
                            })
                            coord_index = end_idx + 1
                    else:
                        # simple single leg from geometry summary
                        summary = props.get("summary", {}) or {}
                        legs = _make_leg_from_geometry(geometry or {"coordinates": coords_for_ors}, summary=summary, start_iso=(trip.start_datetime.isoformat() if trip.start_datetime else None))
                        summary_out = {
                            "total_duration_s": int(summary.get("duration", 0)),
                            "total_distance_m": int(summary.get("distance", 0))
                        }

                    # Persist route on success
                    trip.route_geojson = {
                        "geometry": geometry,
                        "legs": legs,
                        "summary": summary_out
                    }
                    trip.save()
                    succeeded = True
                    break
                except RequestException as e:
                    logger.warning("ORS request to %s failed for trip %s: %s", url, trip.pk, str(e))
                    continue
                except Exception as e:
                    logger.exception("Unexpected ORS error for trip %s at %s: %s", trip.pk, url, str(e))
                    continue

            if not succeeded:
                logger.warning("All ORS attempts failed for trip %s tried=%s; falling back", trip.pk, tried)
                geometry = {"type": "LineString", "coordinates": coords_for_ors}
                legs = _make_leg_from_geometry(geometry, summary=None, start_iso=(trip.start_datetime.isoformat() if trip.start_datetime else None))
                trip.route_geojson = {"geometry": geometry, "legs": legs, "summary": {"total_duration_s": 0, "total_distance_m": 0}}
                trip.save()
                return Response(trip.route_geojson)

            # respond with saved geometry
            return Response(trip.route_geojson)

        # If ORS not configured or insufficient coords -> fallback
        logger.info("ORS not configured or not enough coords for trip %s; using fallback", trip.pk)
        fallback_geom = {"type": "LineString", "coordinates": []}
        if trip.start_lat is not None and trip.dropoff_lat is not None:
            fallback_geom['coordinates'] = [[trip.start_lng, trip.start_lat], [trip.dropoff_lng, trip.dropoff_lat]]
            legs = [{
                "start": trip.start_datetime.isoformat() if trip.start_datetime else None,
                "duration_s": 6 * 3600,
                "distance_m": 100000,
                "start_coords": [trip.start_lng, trip.start_lat] if trip.start_lat is not None and trip.start_lng is not None else None,
                "end_coords": [trip.dropoff_lng, trip.dropoff_lat] if trip.dropoff_lat is not None and trip.dropoff_lng is not None else None,
            }]
            trip.route_geojson = {"geometry": fallback_geom, "legs": legs, "summary": {"total_duration_s": 6 * 3600, "total_distance_m": 100000}}
            trip.save()
            return Response(trip.route_geojson)

        # final default empty response
        return Response({"geometry": {"type": "LineString", "coordinates": []}, "legs": [], "summary": {"total_duration_s": 0, "total_distance_m": 0}})


class TripDetailView(RetrieveAPIView):
    """Retrieve full Trip JSON."""
    queryset = Trip.objects.all()
    serializer_class = TripSerializer


class ComputeLogsView(APIView):
    def post(self, request, pk):
        trip = get_object_or_404(Trip, pk=pk)
        legs = None
        if trip.route_geojson:
            legs = trip.route_geojson.get('legs', [])
        # allow override legs from request for testing
        if not legs:
            legs = request.data.get('legs', [])
        start_dt = trip.start_datetime
        if not start_dt:
            # try to parse from request if provided
            from dateutil import parser
            start_dt = parser.isoparse(request.data.get('start_datetime')) if request.data.get('start_datetime') else None
        if not start_dt:
            return Response({'detail': 'start_datetime required'}, status=status.HTTP_400_BAD_REQUEST)

        result = simulate_trip(start_dt, legs, trip.current_cycle_hours)
        return Response(result)


class RenderLogView(APIView):
    def post(self, request, pk):
        """Accept pages JSON with base64 images and return a multi-page PDF.

        Supports keys: image_b64, data, image. If ?format=png is present, returns the first image as PNG.
        """
        pages = request.data.get('pages')
        if not pages or not isinstance(pages, list):
            return Response({'detail': 'pages JSON required (list of {image_b64:...})'}, status=status.HTTP_400_BAD_REQUEST)

        logger.info("render-log start trip=%s pages=%d", pk, len(pages))

        images = []
        # decode + validate
        for idx, p in enumerate(pages):
            b64 = p.get('image_b64') or p.get('data') or p.get('image')
            if not b64 or not isinstance(b64, str):
                logger.warning('render-log: missing image data for page %d', idx)
                return Response({'detail': f'missing image data for page {idx}'}, status=status.HTTP_400_BAD_REQUEST)
            if b64.startswith('data:'):
                try:
                    b64 = b64.split(',', 1)[1]
                except Exception:
                    logger.warning('render-log: invalid data URI for page %d', idx)
                    return Response({'detail': f'invalid data URI for page {idx}'}, status=status.HTTP_400_BAD_REQUEST)
            try:
                img_bytes = b64decode(b64)
            except (binascii.Error, Exception) as e:
                logger.warning('render-log: base64 decode failed for page %d: %s', idx, str(e))
                return Response({'detail': f'invalid base64 at page {idx}', 'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
            try:
                img = Image.open(BytesIO(img_bytes))
            except Exception as e:
                logger.warning('render-log: PIL cannot open image at page %d: %s', idx, str(e))
                return Response({'detail': f'invalid image at page {idx}', 'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
            try:
                img = ImageOps.exif_transpose(img)
            except Exception:
                pass
            try:
                img = img.convert('RGB')
            except Exception as e:
                logger.warning('render-log: convert to RGB failed for page %d: %s', idx, str(e))
                return Response({'detail': f'cannot convert image at page {idx} to RGB', 'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
            images.append(img)
            logger.info('render-log: decoded page %d size=%s', idx, getattr(img, 'size', None))

        # PNG direct return
        if request.GET.get('format') == 'png':
            first = images[0]
            out_io = BytesIO()
            first.save(out_io, format='PNG')
            out_io.seek(0)
            response = HttpResponse(out_io.read(), content_type='image/png')
            response['Content-Disposition'] = f'attachment; filename="trip_{pk}_log.png"'
            return response

        # assemble PDF
        buffer = BytesIO()
        c = None
        try:
            for idx, img in enumerate(images):
                w, h = img.size
                try:
                    w_i = int(max(1, round(w)))
                    h_i = int(max(1, round(h)))
                except Exception:
                    w_i, h_i = 800, 600
                if c is None:
                    c = rl_canvas.Canvas(buffer, pagesize=(w_i, h_i))
                else:
                    c.setPageSize((w_i, h_i))
                img_io = BytesIO()
                img.save(img_io, format='PNG')
                img_io.seek(0)
                ir = ImageReader(img_io)
                c.drawImage(ir, 0, 0, width=w_i, height=h_i)
                c.showPage()
            if c is None:
                return Response({'detail': 'no valid images provided'}, status=status.HTTP_400_BAD_REQUEST)
            c.save()
            buffer.seek(0)
            response = HttpResponse(buffer.read(), content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="trip_{pk}_logs.pdf"'
            logger.info('render-log: generated PDF trip=%s pages=%d', pk, len(images))
            return response
        except Exception as e:
            logger.exception('Failed to assemble PDF: %s', str(e))
            return Response({'detail': 'failed to render PDF', 'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

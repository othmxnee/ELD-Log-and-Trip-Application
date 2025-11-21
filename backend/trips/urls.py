from django.urls import path
from .views import TripListCreateView, TripDetailView, TripRouteView, ComputeLogsView, RenderLogView

urlpatterns = [
    path('trips/', TripListCreateView.as_view(), name='trips-list-create'),
    path('trips/<int:pk>/', TripDetailView.as_view(), name='trips-detail'),
    path('trips/<int:pk>/route/', TripRouteView.as_view(), name='trip-route'),
    path('trips/<int:pk>/compute-logs/', ComputeLogsView.as_view(), name='trip-compute-logs'),
    path('trips/<int:pk>/render-log/', RenderLogView.as_view(), name='trip-render-log'),
]

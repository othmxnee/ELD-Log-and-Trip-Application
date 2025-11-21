from django.urls import path, include
from django.http import JsonResponse

def health(request):
    return JsonResponse({'status': 'ok'})

urlpatterns = [
    path('api/', include('trips.urls')),
    path('api/health/', health),
]

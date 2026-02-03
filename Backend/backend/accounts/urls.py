from django.urls import path
from .views import (
    SignupView,
    LoginView,
    sos_alert,
    ContactListCreateView,
    ContactDetailView,
    DeviceRegisterView,
    location_update,
    recent_locations,
)

urlpatterns = [
    path('signup/', SignupView.as_view()),
    path('login/', LoginView.as_view()),
    path('sos/', sos_alert),
    path('contacts/', ContactListCreateView.as_view()),
    path('contacts/<int:pk>/', ContactDetailView.as_view()),
    path('devices/register/', DeviceRegisterView.as_view()),
    path('location/', location_update),
    path('locations/', recent_locations),]
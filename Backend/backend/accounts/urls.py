from django.urls import path
from .views import SignupView, LoginView, sos_alert

urlpatterns = [
    path('signup/', SignupView.as_view()),
    path('login/', LoginView.as_view()),
    path('sos/', sos_alert),
]

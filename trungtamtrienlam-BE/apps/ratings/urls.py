from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'criterias', views.EvaluationCriteriaViewSet, basename='criteria')
router.register(r'award-titles', views.RatingAwardTitleViewSet, basename='award-title')
router.register(r'ratings', views.RatingViewSet, basename='rating')
router.register(r'results', views.RatingResultViewSet, basename='rating-result')

urlpatterns = [path('', include(router.urls))]

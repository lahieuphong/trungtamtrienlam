from django.urls import path
from . import views

urlpatterns = [
    # Staff CRUD — matching 185 path conventions
    path('staff/getlist/', views.StaffListView.as_view(), name='staff-getlist'),
    path('staff/getdetail/', views.StaffDetailView.as_view(), name='staff-getdetail'),
    path('staff/create/', views.StaffCreateView.as_view(), name='staff-create'),
    path('staff/update/', views.StaffUpdateView.as_view(), name='staff-update'),
    path('staff/delete/', views.StaffDeleteView.as_view(), name='staff-delete'),
    path('staff/forgot-password/', views.StaffForgotPasswordView.as_view(), name='staff-forgot-password'),

    # Dropdowns
    path('dropdown/roles/', views.DropdownRolesView.as_view(), name='dropdown-roles'),
    path('dropdown/departments/', views.DropdownDepartmentsView.as_view(), name='dropdown-departments'),
    path('dropdown/organizations/', views.DropdownOrganizationsView.as_view(), name='dropdown-organizations'),
    path('dropdown/provinces/', views.DropdownProvincesView.as_view(), name='dropdown-provinces'),
    path('dropdown/districts/', views.DropdownDistrictsView.as_view(), name='dropdown-districts'),
]

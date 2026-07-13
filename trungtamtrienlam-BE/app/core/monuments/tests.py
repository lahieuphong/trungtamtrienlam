from django.contrib.auth import get_user_model
from django.test import TestCase

from core.authentication.models import Role, UserRole
from core.monuments.models import Monument
from core.monuments.views import _next_level_for_request, _permission_for


class MonumentReviewFlowTests(TestCase):
    def setUp(self):
        Role.objects.all().delete()
        self.user = get_user_model().objects.create_user(
            username='staff',
            email='staff@example.com',
            password='secret123',
        )
        self.staff_role = Role.objects.create(name='Staff', level=4)
        UserRole.objects.create(user=self.user, role=self.staff_role)
        self.director = Role.objects.create(name='Director', level=1, is_director=True, can_assign_task=True)
        self.vice_director = Role.objects.create(name='Vice director', level=2, is_vice_director=True, can_assign_task=True)
        self.department_head = Role.objects.create(name='Department head', level=3, can_assign_task=True)
        self.monument = Monument.objects.create(
            name='Test monument',
            recognition_decision='QD-01',
            address='Address',
            year_of_construction='2026',
            rating='1',
            location='Location',
            user=self.user,
        )

    def test_full_review_flow_uses_department_head_then_vice_director_then_director(self):
        self.assertEqual(_next_level_for_request(self.monument, self.user), 3)

        self.monument.status = Monument.Status.PENDING_APPROVAL
        self.monument.pending_level = 3
        self.assertEqual(_next_level_for_request(self.monument, self.user), 2)

        self.monument.pending_level = 2
        self.assertEqual(_next_level_for_request(self.monument, self.user), 1)

    def test_deleted_vice_director_is_skipped(self):
        self.vice_director.is_deleted = True
        self.vice_director.save(update_fields=['is_deleted'])

        self.assertEqual(_next_level_for_request(self.monument, self.user), 3)

        self.monument.status = Monument.Status.PENDING_APPROVAL
        self.monument.pending_level = 3
        self.assertEqual(_next_level_for_request(self.monument, self.user), 1)

    def test_deleted_department_head_starts_at_vice_director(self):
        self.department_head.is_deleted = True
        self.department_head.save(update_fields=['is_deleted'])

        self.assertEqual(_next_level_for_request(self.monument, self.user), 2)

    def test_deleted_director_makes_vice_director_the_final_review_level(self):
        self.director.is_deleted = True
        self.director.save(update_fields=['is_deleted'])
        vice_user = get_user_model().objects.create_user(username='vice', email='vice@example.com')
        UserRole.objects.create(user=vice_user, role=self.vice_director)

        self.monument.status = Monument.Status.PENDING_APPROVAL
        self.monument.pending_level = 2
        permission = _permission_for(vice_user, self.monument)
        self.assertTrue(permission['isApprove'])
        self.assertFalse(permission['isRequestApproval'])

        self.monument.status = Monument.Status.APPROVED
        self.monument.pending_level = None
        permission = _permission_for(vice_user, self.monument)
        self.assertTrue(permission['isPublic'])

    def test_disabled_review_role_is_skipped(self):
        self.department_head.is_disabled = True
        self.department_head.save(update_fields=['is_disabled'])

        self.assertEqual(_next_level_for_request(self.monument, self.user), 2)

    def test_arbitrary_active_review_level_is_part_of_the_chain_and_can_be_skipped(self):
        section_head = Role.objects.create(name='Section head', level=5, can_assign_task=True)
        junior_role = Role.objects.create(name='Junior staff', level=6)
        UserRole.objects.filter(user=self.user).delete()
        UserRole.objects.create(user=self.user, role=junior_role)

        self.assertEqual(_next_level_for_request(self.monument, self.user), 5)

        section_head.is_deleted = True
        section_head.save(update_fields=['is_deleted'])
        self.assertEqual(_next_level_for_request(self.monument, self.user), 3)

    def test_deleted_role_name_in_user_position_does_not_allow_review(self):
        self.vice_director.is_deleted = True
        self.vice_director.save(update_fields=['is_deleted'])
        stale_user = get_user_model().objects.create_user(
            username='stale-vice',
            email='stale-vice@example.com',
            position='Pho giam doc',
        )

        self.monument.status = Monument.Status.PENDING_APPROVAL
        self.monument.pending_level = 2
        permission = _permission_for(stale_user, self.monument)
        self.assertFalse(permission['isApprove'])
        self.assertFalse(permission['isRequestApproval'])
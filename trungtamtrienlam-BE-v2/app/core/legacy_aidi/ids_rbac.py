from core.legacy_aidi.ids_models import LegacyIdsRole
from core.legacy_aidi.ids_models import LegacyIdsRoleClaim
from core.legacy_aidi.ids_models import LegacyIdsUserClaim
from core.legacy_aidi.ids_models import LegacyIdsUserRole


def _ids_user_id(user_or_id):
    return str(getattr(user_or_id, 'ids_id', None) or getattr(user_or_id, 'Id', None) or getattr(user_or_id, 'id', user_or_id))


def get_user_role_ids(user_or_id):
    user_id = _ids_user_id(user_or_id)
    return list(
        LegacyIdsUserRole.objects
        .filter(UserId=user_id)
        .values_list('RoleId', flat=True)
        .distinct()
    )


def get_user_roles(user_or_id):
    role_ids = get_user_role_ids(user_or_id)
    if not role_ids:
        return LegacyIdsRole.objects.none()
    return LegacyIdsRole.objects.filter(Id__in=role_ids)


def user_has_role(user_or_id, role_name):
    return get_user_roles(user_or_id).filter(Name=role_name).exists()


def get_user_claims(user_or_id):
    user_id = _ids_user_id(user_or_id)
    return LegacyIdsUserClaim.objects.filter(UserId=user_id)


def user_has_claim(user_or_id, claim_type, claim_value=None):
    query = get_user_claims(user_or_id).filter(ClaimType=claim_type)
    if claim_value is not None:
        query = query.filter(ClaimValue=claim_value)
    return query.exists()


def role_has_claim(role_id, claim_type, claim_value=None):
    query = LegacyIdsRoleClaim.objects.filter(RoleId=str(role_id), ClaimType=claim_type)
    if claim_value is not None:
        query = query.filter(ClaimValue=claim_value)
    return query.exists()

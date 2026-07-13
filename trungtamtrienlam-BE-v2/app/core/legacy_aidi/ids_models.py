"""Unmanaged mappings for the 185-IDS IdentityServer database tables.

These classes are opt-in and are not imported by core.legacy_aidi.models,
because 185-IDS is a separate IdentityServer database and table names such
as Users/Roles overlap with 185-BE.
"""

from django.db import models


class LegacyIdsApiResource(models.Model):
    Id = models.IntegerField(db_column='Id', primary_key=True)
    Enabled = models.BooleanField(db_column='Enabled', blank=True, null=True)
    Name = models.CharField(max_length=255, db_column='Name', blank=True, null=True)
    DisplayName = models.CharField(max_length=255, db_column='DisplayName', blank=True, null=True)
    Description = models.TextField(db_column='Description', blank=True, null=True)
    AllowedAccessTokenSigningAlgorithms = models.TextField(db_column='AllowedAccessTokenSigningAlgorithms', blank=True, null=True)
    ShowInDiscoveryDocument = models.BooleanField(db_column='ShowInDiscoveryDocument', blank=True, null=True)
    Created = models.DateTimeField(db_column='Created', blank=True, null=True)
    Updated = models.DateTimeField(db_column='Updated', blank=True, null=True)
    LastAccessed = models.DateTimeField(db_column='LastAccessed', blank=True, null=True)
    NonEditable = models.BooleanField(db_column='NonEditable', blank=True, null=True)

    class Meta:
        app_label = 'legacy_aidi_ids'
        managed = False
        db_table = 'ApiResources'


class LegacyIdsApiResourceClaim(models.Model):
    Id = models.IntegerField(db_column='Id', primary_key=True)
    ApiResourceId = models.IntegerField(db_column='ApiResourceId', blank=True, null=True)
    Type = models.CharField(max_length=255, db_column='Type', blank=True, null=True)

    class Meta:
        app_label = 'legacy_aidi_ids'
        managed = False
        db_table = 'ApiResourceClaims'


class LegacyIdsApiResourceProperty(models.Model):
    Id = models.IntegerField(db_column='Id', primary_key=True)
    ApiResourceId = models.IntegerField(db_column='ApiResourceId', blank=True, null=True)
    Key = models.CharField(max_length=255, db_column='Key', blank=True, null=True)
    Value = models.TextField(db_column='Value', blank=True, null=True)

    class Meta:
        app_label = 'legacy_aidi_ids'
        managed = False
        db_table = 'ApiResourceProperties'


class LegacyIdsApiResourceScope(models.Model):
    Id = models.IntegerField(db_column='Id', primary_key=True)
    Scope = models.CharField(max_length=255, db_column='Scope', blank=True, null=True)
    ApiResourceId = models.IntegerField(db_column='ApiResourceId', blank=True, null=True)

    class Meta:
        app_label = 'legacy_aidi_ids'
        managed = False
        db_table = 'ApiResourceScopes'


class LegacyIdsApiResourceSecret(models.Model):
    Id = models.IntegerField(db_column='Id', primary_key=True)
    ApiResourceId = models.IntegerField(db_column='ApiResourceId', blank=True, null=True)
    Description = models.TextField(db_column='Description', blank=True, null=True)
    Value = models.TextField(db_column='Value', blank=True, null=True)
    Expiration = models.DateTimeField(db_column='Expiration', blank=True, null=True)
    Type = models.CharField(max_length=255, db_column='Type', blank=True, null=True)
    Created = models.DateTimeField(db_column='Created', blank=True, null=True)

    class Meta:
        app_label = 'legacy_aidi_ids'
        managed = False
        db_table = 'ApiResourceSecrets'


class LegacyIdsApiScope(models.Model):
    Id = models.IntegerField(db_column='Id', primary_key=True)
    Enabled = models.BooleanField(db_column='Enabled', blank=True, null=True)
    Name = models.CharField(max_length=255, db_column='Name', blank=True, null=True)
    DisplayName = models.CharField(max_length=255, db_column='DisplayName', blank=True, null=True)
    Description = models.TextField(db_column='Description', blank=True, null=True)
    Required = models.BooleanField(db_column='Required', blank=True, null=True)
    Emphasize = models.BooleanField(db_column='Emphasize', blank=True, null=True)
    ShowInDiscoveryDocument = models.BooleanField(db_column='ShowInDiscoveryDocument', blank=True, null=True)

    class Meta:
        app_label = 'legacy_aidi_ids'
        managed = False
        db_table = 'ApiScopes'


class LegacyIdsApiScopeClaim(models.Model):
    Id = models.IntegerField(db_column='Id', primary_key=True)
    ScopeId = models.IntegerField(db_column='ScopeId', blank=True, null=True)
    Type = models.CharField(max_length=255, db_column='Type', blank=True, null=True)

    class Meta:
        app_label = 'legacy_aidi_ids'
        managed = False
        db_table = 'ApiScopeClaims'


class LegacyIdsApiScopeProperty(models.Model):
    Id = models.IntegerField(db_column='Id', primary_key=True)
    ScopeId = models.IntegerField(db_column='ScopeId', blank=True, null=True)
    Key = models.CharField(max_length=255, db_column='Key', blank=True, null=True)
    Value = models.TextField(db_column='Value', blank=True, null=True)

    class Meta:
        app_label = 'legacy_aidi_ids'
        managed = False
        db_table = 'ApiScopeProperties'


class LegacyIdsClient(models.Model):
    Id = models.IntegerField(db_column='Id', primary_key=True)
    Enabled = models.BooleanField(db_column='Enabled', blank=True, null=True)
    ClientId = models.CharField(max_length=255, db_column='ClientId', blank=True, null=True)
    ProtocolType = models.CharField(max_length=255, db_column='ProtocolType', blank=True, null=True)
    RequireClientSecret = models.BooleanField(db_column='RequireClientSecret', blank=True, null=True)
    ClientName = models.CharField(max_length=255, db_column='ClientName', blank=True, null=True)
    Description = models.TextField(db_column='Description', blank=True, null=True)
    ClientUri = models.TextField(db_column='ClientUri', blank=True, null=True)
    LogoUri = models.TextField(db_column='LogoUri', blank=True, null=True)
    RequireConsent = models.BooleanField(db_column='RequireConsent', blank=True, null=True)
    AllowRememberConsent = models.BooleanField(db_column='AllowRememberConsent', blank=True, null=True)
    AlwaysIncludeUserClaimsInIdToken = models.BooleanField(db_column='AlwaysIncludeUserClaimsInIdToken', blank=True, null=True)
    RequirePkce = models.BooleanField(db_column='RequirePkce', blank=True, null=True)
    AllowPlainTextPkce = models.BooleanField(db_column='AllowPlainTextPkce', blank=True, null=True)
    RequireRequestObject = models.BooleanField(db_column='RequireRequestObject', blank=True, null=True)
    AllowAccessTokensViaBrowser = models.BooleanField(db_column='AllowAccessTokensViaBrowser', blank=True, null=True)
    FrontChannelLogoutUri = models.TextField(db_column='FrontChannelLogoutUri', blank=True, null=True)
    FrontChannelLogoutSessionRequired = models.BooleanField(db_column='FrontChannelLogoutSessionRequired', blank=True, null=True)
    BackChannelLogoutUri = models.TextField(db_column='BackChannelLogoutUri', blank=True, null=True)
    BackChannelLogoutSessionRequired = models.BooleanField(db_column='BackChannelLogoutSessionRequired', blank=True, null=True)
    AllowOfflineAccess = models.BooleanField(db_column='AllowOfflineAccess', blank=True, null=True)
    IdentityTokenLifetime = models.IntegerField(db_column='IdentityTokenLifetime', blank=True, null=True)
    AllowedIdentityTokenSigningAlgorithms = models.TextField(db_column='AllowedIdentityTokenSigningAlgorithms', blank=True, null=True)
    AccessTokenLifetime = models.IntegerField(db_column='AccessTokenLifetime', blank=True, null=True)
    AuthorizationCodeLifetime = models.IntegerField(db_column='AuthorizationCodeLifetime', blank=True, null=True)
    ConsentLifetime = models.IntegerField(db_column='ConsentLifetime', blank=True, null=True)
    AbsoluteRefreshTokenLifetime = models.IntegerField(db_column='AbsoluteRefreshTokenLifetime', blank=True, null=True)
    SlidingRefreshTokenLifetime = models.IntegerField(db_column='SlidingRefreshTokenLifetime', blank=True, null=True)
    RefreshTokenUsage = models.IntegerField(db_column='RefreshTokenUsage', blank=True, null=True)
    UpdateAccessTokenClaimsOnRefresh = models.BooleanField(db_column='UpdateAccessTokenClaimsOnRefresh', blank=True, null=True)
    RefreshTokenExpiration = models.IntegerField(db_column='RefreshTokenExpiration', blank=True, null=True)
    AccessTokenType = models.IntegerField(db_column='AccessTokenType', blank=True, null=True)
    EnableLocalLogin = models.BooleanField(db_column='EnableLocalLogin', blank=True, null=True)
    IncludeJwtId = models.BooleanField(db_column='IncludeJwtId', blank=True, null=True)
    AlwaysSendClientClaims = models.BooleanField(db_column='AlwaysSendClientClaims', blank=True, null=True)
    ClientClaimsPrefix = models.CharField(max_length=255, db_column='ClientClaimsPrefix', blank=True, null=True)
    PairWiseSubjectSalt = models.CharField(max_length=255, db_column='PairWiseSubjectSalt', blank=True, null=True)
    Created = models.DateTimeField(db_column='Created', blank=True, null=True)
    Updated = models.DateTimeField(db_column='Updated', blank=True, null=True)
    LastAccessed = models.DateTimeField(db_column='LastAccessed', blank=True, null=True)
    UserSsoLifetime = models.IntegerField(db_column='UserSsoLifetime', blank=True, null=True)
    UserCodeType = models.CharField(max_length=255, db_column='UserCodeType', blank=True, null=True)
    DeviceCodeLifetime = models.IntegerField(db_column='DeviceCodeLifetime', blank=True, null=True)
    NonEditable = models.BooleanField(db_column='NonEditable', blank=True, null=True)

    class Meta:
        app_label = 'legacy_aidi_ids'
        managed = False
        db_table = 'Clients'


class LegacyIdsClientClaim(models.Model):
    Id = models.IntegerField(db_column='Id', primary_key=True)
    Type = models.CharField(max_length=255, db_column='Type', blank=True, null=True)
    Value = models.TextField(db_column='Value', blank=True, null=True)
    ClientId = models.IntegerField(db_column='ClientId', blank=True, null=True)

    class Meta:
        app_label = 'legacy_aidi_ids'
        managed = False
        db_table = 'ClientClaims'


class LegacyIdsClientCorsOrigin(models.Model):
    Id = models.IntegerField(db_column='Id', primary_key=True)
    Origin = models.CharField(max_length=255, db_column='Origin', blank=True, null=True)
    ClientId = models.IntegerField(db_column='ClientId', blank=True, null=True)

    class Meta:
        app_label = 'legacy_aidi_ids'
        managed = False
        db_table = 'ClientCorsOrigins'


class LegacyIdsClientGrantType(models.Model):
    Id = models.IntegerField(db_column='Id', primary_key=True)
    GrantType = models.CharField(max_length=255, db_column='GrantType', blank=True, null=True)
    ClientId = models.IntegerField(db_column='ClientId', blank=True, null=True)

    class Meta:
        app_label = 'legacy_aidi_ids'
        managed = False
        db_table = 'ClientGrantTypes'


class LegacyIdsClientIdPrestriction(models.Model):
    Id = models.IntegerField(db_column='Id', primary_key=True)
    Provider = models.CharField(max_length=255, db_column='Provider', blank=True, null=True)
    ClientId = models.IntegerField(db_column='ClientId', blank=True, null=True)

    class Meta:
        app_label = 'legacy_aidi_ids'
        managed = False
        db_table = 'ClientIdPRestrictions'


class LegacyIdsClientPostLogoutRedirectUri(models.Model):
    Id = models.IntegerField(db_column='Id', primary_key=True)
    PostLogoutRedirectUri = models.TextField(db_column='PostLogoutRedirectUri', blank=True, null=True)
    ClientId = models.IntegerField(db_column='ClientId', blank=True, null=True)

    class Meta:
        app_label = 'legacy_aidi_ids'
        managed = False
        db_table = 'ClientPostLogoutRedirectUris'


class LegacyIdsClientProperty(models.Model):
    Id = models.IntegerField(db_column='Id', primary_key=True)
    ClientId = models.IntegerField(db_column='ClientId', blank=True, null=True)
    Key = models.CharField(max_length=255, db_column='Key', blank=True, null=True)
    Value = models.TextField(db_column='Value', blank=True, null=True)

    class Meta:
        app_label = 'legacy_aidi_ids'
        managed = False
        db_table = 'ClientProperties'


class LegacyIdsClientRedirectUri(models.Model):
    Id = models.IntegerField(db_column='Id', primary_key=True)
    RedirectUri = models.TextField(db_column='RedirectUri', blank=True, null=True)
    ClientId = models.IntegerField(db_column='ClientId', blank=True, null=True)

    class Meta:
        app_label = 'legacy_aidi_ids'
        managed = False
        db_table = 'ClientRedirectUris'


class LegacyIdsClientScope(models.Model):
    Id = models.IntegerField(db_column='Id', primary_key=True)
    Scope = models.CharField(max_length=255, db_column='Scope', blank=True, null=True)
    ClientId = models.IntegerField(db_column='ClientId', blank=True, null=True)

    class Meta:
        app_label = 'legacy_aidi_ids'
        managed = False
        db_table = 'ClientScopes'


class LegacyIdsClientSecret(models.Model):
    Id = models.IntegerField(db_column='Id', primary_key=True)
    ClientId = models.IntegerField(db_column='ClientId', blank=True, null=True)
    Description = models.TextField(db_column='Description', blank=True, null=True)
    Value = models.TextField(db_column='Value', blank=True, null=True)
    Expiration = models.DateTimeField(db_column='Expiration', blank=True, null=True)
    Type = models.CharField(max_length=255, db_column='Type', blank=True, null=True)
    Created = models.DateTimeField(db_column='Created', blank=True, null=True)

    class Meta:
        app_label = 'legacy_aidi_ids'
        managed = False
        db_table = 'ClientSecrets'


class LegacyIdsDeviceCode(models.Model):
    UserCode = models.CharField(max_length=255, db_column='UserCode', primary_key=True)
    DeviceCode1 = models.CharField(max_length=255, db_column='DeviceCode', blank=True, null=True)
    SubjectId = models.CharField(max_length=255, db_column='SubjectId', blank=True, null=True)
    SessionId = models.CharField(max_length=255, db_column='SessionId', blank=True, null=True)
    ClientId = models.CharField(max_length=255, db_column='ClientId', blank=True, null=True)
    Description = models.TextField(db_column='Description', blank=True, null=True)
    CreationTime = models.DateTimeField(db_column='CreationTime', blank=True, null=True)
    Expiration = models.DateTimeField(db_column='Expiration', blank=True, null=True)
    Data = models.TextField(db_column='Data', blank=True, null=True)

    class Meta:
        app_label = 'legacy_aidi_ids'
        managed = False
        db_table = 'DeviceCodes'


class LegacyIdsIdentityResourcesLegacy(models.Model):
    Id = models.IntegerField(db_column='Id', primary_key=True)
    Enabled = models.BooleanField(db_column='Enabled', blank=True, null=True)
    Name = models.CharField(max_length=255, db_column='Name', blank=True, null=True)
    DisplayName = models.CharField(max_length=255, db_column='DisplayName', blank=True, null=True)
    Description = models.TextField(db_column='Description', blank=True, null=True)
    Required = models.BooleanField(db_column='Required', blank=True, null=True)
    Emphasize = models.BooleanField(db_column='Emphasize', blank=True, null=True)
    ShowInDiscoveryDocument = models.BooleanField(db_column='ShowInDiscoveryDocument', blank=True, null=True)
    Created = models.DateTimeField(db_column='Created', blank=True, null=True)
    Updated = models.DateTimeField(db_column='Updated', blank=True, null=True)
    NonEditable = models.BooleanField(db_column='NonEditable', blank=True, null=True)

    class Meta:
        app_label = 'legacy_aidi_ids'
        managed = False
        db_table = 'IdentityResources'


class LegacyIdsIdentityResourceClaim(models.Model):
    Id = models.IntegerField(db_column='Id', primary_key=True)
    IdentityResourceId = models.IntegerField(db_column='IdentityResourceId', blank=True, null=True)
    Type = models.CharField(max_length=255, db_column='Type', blank=True, null=True)

    class Meta:
        app_label = 'legacy_aidi_ids'
        managed = False
        db_table = 'IdentityResourceClaims'


class LegacyIdsIdentityResourceProperty(models.Model):
    Id = models.IntegerField(db_column='Id', primary_key=True)
    IdentityResourceId = models.IntegerField(db_column='IdentityResourceId', blank=True, null=True)
    Key = models.CharField(max_length=255, db_column='Key', blank=True, null=True)
    Value = models.TextField(db_column='Value', blank=True, null=True)

    class Meta:
        app_label = 'legacy_aidi_ids'
        managed = False
        db_table = 'IdentityResourceProperties'


class LegacyIdsIdentityResource(models.Model):
    Id = models.CharField(max_length=255, db_column='Id', primary_key=True)
    Enabled = models.BooleanField(db_column='Enabled', blank=True, null=True)
    Name = models.CharField(max_length=255, db_column='Name', blank=True, null=True)
    DisplayName = models.CharField(max_length=255, db_column='DisplayName', blank=True, null=True)
    Description = models.TextField(db_column='Description', blank=True, null=True)
    Required = models.BooleanField(db_column='Required', blank=True, null=True)
    Emphasize = models.BooleanField(db_column='Emphasize', blank=True, null=True)
    ShowInDiscoveryDocument = models.BooleanField(db_column='ShowInDiscoveryDocument', blank=True, null=True)
    Created = models.DateTimeField(db_column='Created', blank=True, null=True)
    Updated = models.DateTimeField(db_column='Updated', blank=True, null=True)
    NonEditable = models.BooleanField(db_column='NonEditable', blank=True, null=True)

    class Meta:
        app_label = 'legacy_aidi_ids'
        managed = False
        db_table = 'IdentityResources'


class LegacyIdsPasswordResetToken(models.Model):
    Id = models.CharField(max_length=255, db_column='Id', primary_key=True)
    UserId = models.CharField(max_length=255, db_column='UserId', blank=True, null=True)
    Token = models.TextField(db_column='Token', blank=True, null=True)
    ExpireAt = models.DateTimeField(db_column='ExpireAt', blank=True, null=True)

    class Meta:
        app_label = 'legacy_aidi_ids'
        managed = False
        db_table = 'PasswordResetTokens'


class LegacyIdsPersistedGrant(models.Model):
    Key = models.CharField(max_length=255, db_column='Key', primary_key=True)
    Type = models.CharField(max_length=255, db_column='Type', blank=True, null=True)
    SubjectId = models.CharField(max_length=255, db_column='SubjectId', blank=True, null=True)
    SessionId = models.CharField(max_length=255, db_column='SessionId', blank=True, null=True)
    ClientId = models.CharField(max_length=255, db_column='ClientId', blank=True, null=True)
    Description = models.TextField(db_column='Description', blank=True, null=True)
    CreationTime = models.DateTimeField(db_column='CreationTime', blank=True, null=True)
    Expiration = models.DateTimeField(db_column='Expiration', blank=True, null=True)
    ConsumedTime = models.DateTimeField(db_column='ConsumedTime', blank=True, null=True)
    Data = models.TextField(db_column='Data', blank=True, null=True)

    class Meta:
        app_label = 'legacy_aidi_ids'
        managed = False
        db_table = 'PersistedGrants'


class LegacyIdsRole(models.Model):
    Id = models.CharField(max_length=255, db_column='Id', primary_key=True)
    Name = models.CharField(max_length=255, db_column='Name', blank=True, null=True)
    NormalizedName = models.CharField(max_length=255, db_column='NormalizedName', blank=True, null=True)
    ConcurrencyStamp = models.CharField(max_length=255, db_column='ConcurrencyStamp', blank=True, null=True)

    class Meta:
        app_label = 'legacy_aidi_ids'
        managed = False
        db_table = 'Roles'


class LegacyIdsRoleClaim(models.Model):
    Id = models.IntegerField(db_column='Id', primary_key=True)
    RoleId = models.CharField(max_length=255, db_column='RoleId', blank=True, null=True)
    ClaimType = models.CharField(max_length=255, db_column='ClaimType', blank=True, null=True)
    ClaimValue = models.TextField(db_column='ClaimValue', blank=True, null=True)

    class Meta:
        app_label = 'legacy_aidi_ids'
        managed = False
        db_table = 'RoleClaims'


class LegacyIdsUser(models.Model):
    Id = models.CharField(max_length=255, db_column='Id', primary_key=True)
    IsEnabled = models.BooleanField(db_column='IsEnabled', blank=True, null=True)
    EmployeeId = models.CharField(max_length=255, db_column='EmployeeId', blank=True, null=True)
    UserName = models.CharField(max_length=255, db_column='UserName', blank=True, null=True)
    NormalizedUserName = models.CharField(max_length=255, db_column='NormalizedUserName', blank=True, null=True)
    Email = models.CharField(max_length=255, db_column='Email', blank=True, null=True)
    NormalizedEmail = models.CharField(max_length=255, db_column='NormalizedEmail', blank=True, null=True)
    EmailConfirmed = models.BooleanField(db_column='EmailConfirmed', blank=True, null=True)
    PasswordHash = models.CharField(max_length=255, db_column='PasswordHash', blank=True, null=True)
    SecurityStamp = models.CharField(max_length=255, db_column='SecurityStamp', blank=True, null=True)
    ConcurrencyStamp = models.CharField(max_length=255, db_column='ConcurrencyStamp', blank=True, null=True)
    PhoneNumber = models.CharField(max_length=255, db_column='PhoneNumber', blank=True, null=True)
    PhoneNumberConfirmed = models.BooleanField(db_column='PhoneNumberConfirmed', blank=True, null=True)
    TwoFactorEnabled = models.BooleanField(db_column='TwoFactorEnabled', blank=True, null=True)
    LockoutEnd = models.DateTimeField(db_column='LockoutEnd', blank=True, null=True)
    LockoutEnabled = models.BooleanField(db_column='LockoutEnabled', blank=True, null=True)
    AccessFailedCount = models.IntegerField(db_column='AccessFailedCount', blank=True, null=True)

    class Meta:
        app_label = 'legacy_aidi_ids'
        managed = False
        db_table = 'Users'


class LegacyIdsUserClaim(models.Model):
    Id = models.IntegerField(db_column='Id', primary_key=True)
    UserId = models.CharField(max_length=255, db_column='UserId', blank=True, null=True)
    ClaimType = models.CharField(max_length=255, db_column='ClaimType', blank=True, null=True)
    ClaimValue = models.TextField(db_column='ClaimValue', blank=True, null=True)

    class Meta:
        app_label = 'legacy_aidi_ids'
        managed = False
        db_table = 'UserClaims'


class LegacyIdsUserLogin(models.Model):
    LoginProvider = models.CharField(max_length=255, db_column='LoginProvider', primary_key=True)
    ProviderKey = models.CharField(max_length=255, db_column='ProviderKey', blank=True, null=True)
    ProviderDisplayName = models.CharField(max_length=255, db_column='ProviderDisplayName', blank=True, null=True)
    UserId = models.CharField(max_length=255, db_column='UserId', blank=True, null=True)

    class Meta:
        app_label = 'legacy_aidi_ids'
        managed = False
        db_table = 'UserLogins'


class LegacyIdsUserToken(models.Model):
    UserId = models.CharField(max_length=255, db_column='UserId', primary_key=True)
    LoginProvider = models.CharField(max_length=255, db_column='LoginProvider', blank=True, null=True)
    Name = models.CharField(max_length=255, db_column='Name', blank=True, null=True)
    Value = models.TextField(db_column='Value', blank=True, null=True)

    class Meta:
        app_label = 'legacy_aidi_ids'
        managed = False
        db_table = 'UserTokens'


class LegacyIdsUserRole(models.Model):
    UserId = models.CharField(max_length=255, db_column='UserId', primary_key=True)
    RoleId = models.CharField(max_length=255, db_column='RoleId', blank=True, null=True)

    class Meta:
        app_label = 'legacy_aidi_ids'
        managed = False
        db_table = 'UserRoles'


__all__ = [
    'LegacyIdsApiResource',
    'LegacyIdsApiResourceClaim',
    'LegacyIdsApiResourceProperty',
    'LegacyIdsApiResourceScope',
    'LegacyIdsApiResourceSecret',
    'LegacyIdsApiScope',
    'LegacyIdsApiScopeClaim',
    'LegacyIdsApiScopeProperty',
    'LegacyIdsClient',
    'LegacyIdsClientClaim',
    'LegacyIdsClientCorsOrigin',
    'LegacyIdsClientGrantType',
    'LegacyIdsClientIdPrestriction',
    'LegacyIdsClientPostLogoutRedirectUri',
    'LegacyIdsClientProperty',
    'LegacyIdsClientRedirectUri',
    'LegacyIdsClientScope',
    'LegacyIdsClientSecret',
    'LegacyIdsDeviceCode',
    'LegacyIdsIdentityResourcesLegacy',
    'LegacyIdsIdentityResourceClaim',
    'LegacyIdsIdentityResourceProperty',
    'LegacyIdsIdentityResource',
    'LegacyIdsPasswordResetToken',
    'LegacyIdsPersistedGrant',
    'LegacyIdsRole',
    'LegacyIdsRoleClaim',
    'LegacyIdsUser',
    'LegacyIdsUserClaim',
    'LegacyIdsUserLogin',
    'LegacyIdsUserToken',
    'LegacyIdsUserRole',
]

# 185-BE Legacy Database Flow

This document records the source analysis used to port the database model layer from `185-BE` into the Django backend. No database server commands were run for this port. The target code only adds unmanaged Django model mappings and helper functions.

## Source Layout

- C# database DTO/models: `Cores/AIDI.Model/Databases`
- Shared base entity: `Cores/AIDI.Model/Config/CMSEntity.cs`
- EF identity context: `AIDI.EF/ApplicationDbContext.cs`
- RBAC services: `Cores/AIDI.Core/Services/Roles`, `Cores/AIDI.Core/Services/Permissions`, `Cores/AIDI.Core/Services/UserConcurrentlies`
- Authorization filters: `Cores/AIDI.Core/Authorize/AuthorizeAttribute.cs`, `ClaimRequirementAttribute.cs`

## Porting Approach

The Django app `core.legacy_aidi` maps legacy tables with `managed = False`. This is deliberate: Django will not create, migrate, alter, or delete these tables from these model classes.

Fields marked `[NotMapped]` in C# were skipped because they are runtime/view DTO fields, not database columns. Classes sharing the same `[Table(...)]` were merged into one Django model per table to avoid duplicate `db_table` definitions.

## RBAC Flow

1. `Users` stores account/profile fields from the legacy system.
2. `UserConcurrentlies` assigns a user to `RoleID`, `DepartmentID`, and `OrganizationID`.
3. `Roles` contains role flags such as `IsAdmin`, `IsDirector`, `CanReceiveTask`, `CanAssignTask`, and `CanSeeDepartmentTasks`.
4. `Functions` represents secured modules/features. The source uses `UniqueKey`/`UniqueCode`-style identifiers.
5. `Actions` represents permission actions such as `View`, `Add`, `Edit`, `Delete`, `Confirm`, `Verify`.
6. `Permissions`/`Permisions` connects role + function + action. The source contains both legacy DTO styles, so the Django helper supports both action-row and boolean-flag permission layouts.
7. `AuthorizeAttribute` checks authentication first, handles maintenance lockouts, then checks function/action permission unless the user has an admin role.

## Django Helper

Use `core.legacy_aidi.rbac.has_permission(user_or_id, function_key, action_key)` for the legacy permission flow. It does not run during import; it queries only when called by application code.

## Generated Table Map

| Legacy table | Django model | Source class(es) | Field count |
| --- | --- | --- | ---: |
| ActionInFunctions | LegacyActionInFunction | ActionInFunctionModel, ActionInFunctions | 3 |
| Actions | LegacyAction | ActionModel, Actions | 7 |
| Alerts | LegacyAlert | AlertModel | 9 |
| Artifacts | LegacyArtifact | ArtifactModel | 10 |
| AssetFiles | LegacyAssetFile | AssetFileModel | 6 |
| Assets | LegacyAsset | AssetModel | 15 |
| BackupLogs | LegacyBackupLog | BackupLogsModel | 10 |
| Banners | LegacyBanner | BannerModel | 10 |
| BorrowAssetHistories | LegacyBorrowAssetHistory | BorrowAssetHistoryModel | 6 |
| BorrowAssets | LegacyBorrowAsset | BorrowAssetModel | 13 |
| Borrows | LegacyBorrow | BorrowModel | 12 |
| BusinessHours | LegacyBusinessHour | BusinessHourModel | 11 |
| CalendarFiles | LegacyCalendarFile | CalendarFileModel | 8 |
| CalendarJobs | LegacyCalendarJob | CalendarJobsModel | 7 |
| CalendarJoins | LegacyCalendarJoin | CalendarJoinModel | 11 |
| Calendars | LegacyCalendar | CalendarModel | 20 |
| Categories | LegacyCategory | CategoryModel | 8 |
| CategoryNews | LegacyCategoryNew | CategoryNewModel | 9 |
| CategoryPlanTrips | LegacyCategoryPlanTrip | CategoryPlanTripModel | 7 |
| ChatAwaitConfirm | LegacyChatAwaitConfirm | ChatAwaitConfirmModel | 6 |
| ChatRemind | LegacyChatRemind | ChatRemindModel | 14 |
| ChatRemindJobs | LegacyChatRemindJob | ChatRemindJobModel | 7 |
| ChatRemindUsers | LegacyChatRemindUser | ChatRemindUserModel | 8 |
| ChatVoteOptions | LegacyChatVoteOption | ChatVoteOptionModel | 6 |
| ChatVoteResult | LegacyChatVoteResult | ChatVoteResultModel | 7 |
| ChatVotes | LegacyChatVote | ChatVoteModel | 12 |
| ConfigPageSections | LegacyConfigPageSection | ConfigPageSectionsModel | 7 |
| Configs | LegacyConfig | ConfigModel | 7 |
| ContactManagements | LegacyContactManagement | ContactManagementsModel | 11 |
| Departments | LegacyDepartment | DepartmentModel | 8 |
| DispatchList | LegacyDispatchList | DispatchList | 3 |
| Districts | LegacyDistrict | DistrictModel | 4 |
| DocumentHistories | LegacyDocumentHistory | DocumentHistories | 13 |
| EmailFiles | LegacyEmailFile | EmailFilesModel | 7 |
| EmailSignatures | LegacyEmailSignature | EmailSignaturesModel | 9 |
| Emails | LegacyEmail | Email | 7 |
| EvaluationCriterias | LegacyEvaluationCriteria | EvaluationCriteriasModel | 8 |
| Fields | LegacyField | FieldModel | 7 |
| FileClouds | LegacyFileCloud | FileCloudModel | 8 |
| FileDatas | LegacyFileData | FileDataModel | 1 |
| FileShares | LegacyFileShare | FileShareModel | 5 |
| Files | LegacyFile | FileModel | 42 |
| FilesGlobal | LegacyFilesGlobal | FilesGlobalModel | 7 |
| FolderRoles | LegacyFolderRole | FolderRoleModel | 5 |
| Folders | LegacyFolder | FolderModel | 29 |
| Form | LegacyForm | FormModel | 13 |
| FormHandling | LegacyFormHandling | FormHandlingModel | 13 |
| FormUser | LegacyFormUser | FormUserModel | 4 |
| Functions | LegacyFunction | FunctionModel, Function | 13 |
| HandSignature | LegacyHandSignature | HandSignatureDocument | 6 |
| HomePageSections | LegacyHomePageSection | HomePageSectionsModel | 7 |
| InternalDocuments | LegacyInternalDocument | InternalDocuments | 11 |
| InternalDocumentsFiles | LegacyInternalDocumentsFile | InternalDocumentsFiles | 10 |
| IntroductionPageSections | LegacyIntroductionPageSection | IntroductionPageSectionsModel | 7 |
| Jobs | LegacyJob | JobModel | 7 |
| LOGLOGOUTS | LegacyLoglogout | LogLogoutModel | 11 |
| Languages | LegacyLanguage | LanguageModel | 4 |
| LogActions | LegacyLogAction | LogActionModel | 13 |
| LogLogins | LegacyLogLogin | LogLoginModel | 10 |
| LogSendEmails | LegacyLogSendEmail | LogSendEmailModel | 12 |
| MaintenanceAllowedUsers | LegacyMaintenanceAllowedUser | MaintenanceAllowedUsersModel | 4 |
| MaintenanceJobs | LegacyMaintenanceJob | MaintenanceJobsModel | 7 |
| MaintenanceLogs | LegacyMaintenanceLog | MaintenanceLogsModel | 5 |
| MaintenanceSessions | LegacyMaintenanceSession | MaintenanceSessionsModel | 15 |
| MenuManagements | LegacyMenuManagement | MenuManagementsModel | 10 |
| MonumentFiles | LegacyMonumentFile | MonumentFileModel | 10 |
| MonumentHistories | LegacyMonumentHistory | MonumentHistoryModel | 11 |
| MonumentSections | LegacyMonumentSection | MonumentSectionModel | 17 |
| Monuments | LegacyMonument | MonumentModel | 24 |
| News | LegacyNew | NewModel | 14 |
| NewsFile | LegacyNewsFile | NewsFileModel | 12 |
| Notifications | LegacyNotification | NotificationModel | 11 |
| Objects | LegacyObject | ObjectModel | 14 |
| Organizations | LegacyOrganization | OrganizationModel | 7 |
| PUSHNOTIFICATIONS | LegacyLogPushNotification | LogPushNotificationModel | 5 |
| Packages | LegacyPackage | PackageModel | 11 |
| Permisions | LegacyPermision | PermissionModel | 6 |
| Permissions | LegacyPermission | Permissions | 10 |
| ProcessingDepartment | LegacyProcessingDepartment | ProcessingDepartment | 3 |
| Provinces | LegacyProvince | ProvinceModel | 3 |
| PushNotifications | LegacyPushNotification | PushNotificationModel | 8 |
| RankingAwardTitles | LegacyRankingAwardTitle | RankingAwardTitlesModel | 16 |
| RatingAwardTitleCriterias | LegacyRatingAwardTitleCriteria | RatingAwardTitleCriteriasModel | 10 |
| RatingAwardTitles | LegacyRatingAwardTitle | RatingAwardTitlesModel | 4 |
| RatingJobs | LegacyRatingJob | RatingJobsModel | 7 |
| RatingParticipants | LegacyRatingParticipant | RatingParticipantsModel | 7 |
| RatingParticipantsExclude | LegacyRatingParticipantsExclude | RatingParticipantsExcludeModel | 4 |
| Ratings | LegacyRating | RatingModel | 17 |
| RestoreLogs | LegacyRestoreLog | RestoreLogsModel | 10 |
| Roles | LegacyRole | Role, RoleModel | 17 |
| RolesDepartment | LegacyRolesDepartment | RolesDepartments | 3 |
| SendCodes | LegacySendCode | SendCodeModel | 10 |
| SettingDashboardItems | LegacySettingDashboardItem | SettingDashboardItemsModel | 6 |
| SettingDashboards | LegacySettingDashboard | SettingDashboardsModel | 4 |
| SettingSendEmails | LegacySettingSendEmail | SettingSendEmailModel | 8 |
| Settings | LegacySetting | SettingModel | 4 |
| SettingsNotification | LegacySettingsNotification | SettingsNotification | 10 |
| ShareLinks | LegacyShareLink | ShareLinkModel | 12 |
| StaffFiles | LegacyStaffFile | StaffFileModel | 11 |
| Staffs | LegacyStaff | StaffModel | 20 |
| Stories | LegacyStory | StoryModel | 14 |
| StoryContents | LegacyStoryContent | StoryContentModel | 11 |
| SystemConfig | LegacySystemConfig | SystemConfigModel | 4 |
| TaskChatFiles | LegacyTaskChatFile | TaskChatFilesModel | 9 |
| TaskChats | LegacyTaskChat | TaskChatModel | 9 |
| TaskConfirm | LegacyTaskConfirm | TaskConfirmModel | 8 |
| TaskDepartments | LegacyTaskDepartment | TaskDepartments | 8 |
| TaskDocumentConfirm | LegacyTaskDocumentConfirm | TaskDocumentConfirmModel | 8 |
| TaskDocuments | LegacyTaskDocument | TaskDocumentModel | 26 |
| TaskExtend | LegacyTaskExtend | TaskExtendModel | 10 |
| TaskFiles | LegacyTaskFile | TaskFileModel | 14 |
| TaskHistories | LegacyTaskHistory | TaskHistoryModel | 15 |
| TaskJobs | LegacyTaskJob | TaskJob | 7 |
| TaskLevel | LegacyTaskLevel | TaskLevelModel | 7 |
| TaskResult | LegacyTaskResult | TaskResult | 16 |
| TaskUserChecks | LegacyTaskUserCheck | TaskUserCheckModel | 9 |
| TaskUsers | LegacyTaskUser | TaskUserModel | 10 |
| TaskWorks | LegacyTaskWork | TaskWorkModel | 15 |
| Tasks | LegacyTask | TaskModel | 16 |
| TemplateSendEmailS | LegacyTemplateSendEmail | TemplateSendEmailModel | 9 |
| Templates | LegacyTemplate | TemplateModel | 8 |
| UrgencyLevel | LegacyUrgencyLevel | UrgencyLevelModel | 3 |
| UserActionStories | LegacyUserActionStory | UserActionStoryModel | 10 |
| UserConcurrentlies | LegacyUserConcurrently | UserConcurrentlyModel | 7 |
| Users | LegacyUser | User, UserModel | 42 |
| Wards | LegacyWard | WardModel | 4 |
| WebSitePages | LegacyWebSitePage | WebSitePagesModel | 5 |

## Additional 185 Projects

### 185-Cloud

`185-Cloud` is a backup worker. It has its own small EF context with `BackupLogs`, `RestoreLogs`, and `SettingsNotification`. These are copied as opt-in unmanaged models in `cloud_models.py` because those table names overlap with 185-BE and may belong to a separate database/schema.

### 185-IDS

`185-IDS` is the IdentityServer/Admin project. Its database flow is IdentityServer-style:

1. `Users` / `Roles` store account and role data.
2. `UserRoles` maps users to roles.
3. `UserClaims` and `RoleClaims` store claim-based permissions.
4. `Clients`, `ClientScopes`, `ClientSecrets`, `ApiResources`, `ApiScopes`, `IdentityResources`, `PersistedGrants`, and `DeviceCodes` support OAuth/OpenID Connect configuration and token flow.

These are copied as opt-in unmanaged models in `ids_models.py`, with helper functions in `ids_rbac.py`. They are not auto-imported by the main Django app to avoid duplicate table checks against the 185-BE mappings.

### 185-FE

`185-FE` is a Next.js frontend. It contains API clients, constants, hooks, and permission consumers such as `hooks/usePermission.js`, but no backend database model layer to port.

## Additional Generated Modules

- `cloud_models.py`: 3 unmanaged 185-Cloud database mappings.
- `ids_models.py`: 31 unmanaged 185-IDS entity mappings plus `LegacyIdsUserRole`.
- `ids_rbac.py`: IdentityServer role/claim helper flow.

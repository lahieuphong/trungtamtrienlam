# 185-BE Database Models Analysis

Scope: `185-BE/Cores/AIDI.Model/Databases` only. No database server, restore, migration, seed, or schema-altering command was run.

## What Was Copied

- `models.py`: 135 unmanaged Django model classes mapped one-to-one by legacy table name.
- `rbac.py`: helper functions for the legacy role/function/action permission check.
- `relations.py`: 155 inferred table relationships from `...ID` columns.
- `apps.py` and `settings.py`: register `core.legacy_aidi` so Django can import the models.

All copied database mappings use `managed = False`, so Django will not create, alter, or delete these legacy tables from these models.

## Source Summary

- C# model files scanned: 154
- Classes with `[Table(...)]`: 140
- Unique legacy tables: 135
- Duplicate table classes merged: 5
- `[NotMapped]` properties skipped: 119

Duplicate table class groups merged into one Django model:
- `ActionInFunctions`: `ActionInFunctionModel`, `ActionInFunctions`
- `Actions`: `ActionModel`, `Actions`
- `Functions`: `FunctionModel`, `Function`
- `Roles`: `Role`, `RoleModel`
- `Users`: `User`, `UserModel`

## RBAC Flow

1. `Users` stores the legacy account/profile row.
2. `UserConcurrentlies` links one user to one or more `RoleID`, `DepartmentID`, and `OrganizationID` rows.
3. `Roles` stores role-level flags. `IsAdmin = true` is treated as an admin bypass in the copied helper.
4. `Functions` stores protected modules/features. The source uses `UniqueKey` and also has older `UniqueCode` style fields.
5. `Actions` stores protected operations such as view/add/edit/delete/confirm/verify.
6. `ActionInFunctions` lists which actions are available for which function.
7. `Permissions` supports the newer table shape, including boolean flags like `IsView`, `IsAdd`, `IsEdit`, and also source SQL references to `ActionID`.
8. `Permisions` is the misspelled legacy table from `PermissionModel.cs`, using direct `RoleID + FunctionID + ActionID` rows.

Use `core.legacy_aidi.rbac.has_permission(user_or_id, function_key, action_key)` for this flow. It checks admin roles first, then follows `UserConcurrentlies -> Roles -> Permissions/Permisions -> Functions/Actions`.

## Key Relationships

These are inferred from C# column names because the source models mostly define scalar ID fields rather than EF navigation properties:

- `UserConcurrentlies.UserID -> Users.ID`
- `UserConcurrentlies.RoleID -> Roles.ID`
- `UserConcurrentlies.DepartmentID -> Departments.ID`
- `UserConcurrentlies.OrganizationID -> Organizations.ID`
- `Permissions.RoleID -> Roles.ID`, `Permissions.FunctionID -> Functions.ID`, `Permissions.ActionID -> Actions.ID`
- `Permisions.RoleID -> Roles.ID`, `Permisions.FunctionID -> Functions.ID`, `Permisions.ActionID -> Actions.ID`
- `ActionInFunctions.FunctionID -> Functions.ID`, `ActionInFunctions.ActionID -> Actions.ID`
- `Staffs.UserID -> Users.ID`, `Staffs.DepartmentID -> Departments.ID`, `Staffs.RoleID -> Roles.ID`
- `RolesDepartment.RoleID -> Roles.ID`, `RolesDepartment.DepartmentID -> Departments.ID`
- `TaskUsers.UserID -> Users.ID`, `TaskUsers.TaskID -> Tasks.ID`, `TaskDepartments.DepartmentID -> Departments.ID` connect task assignment back to users and departments.
- `Files.FolderID -> Folders.ID`, `Files.UserID -> Users.ID`, `FileShares.FileID -> Files.ID`
- `Chats`, `ChatMessages`, `ChatUsers`, `ChatSeen`, `ChatVotes`, and `ChatRemind*` form the chat module graph.

The complete inferred relationship list is in `relations.py` as `LEGACY_RELATIONS`. Each entry is metadata only and has `confidence = "inferred_from_column_name"`.

## Domain Flow Overview

- Identity/RBAC: `Users`, `UserConcurrentlies`, `Roles`, `Departments`, `Organizations`, `Functions`, `Actions`, `ActionInFunctions`, `Permissions`, `Permisions`.
- Staff/org structure: `Staffs`, `StaffFiles`, `Departments`, `Organizations`, `RolesDepartment`.
- Content/site: `Categories`, `CategoryNews`, `News`, `NewsFile`, `Stories`, `StoryContents`, `Banners`, `HomePageSections`, `IntroductionPageSections`, `WebSitePages`, `MenuManagements`.
- Monuments/objects: `Objects`, `Artifacts`, `Monuments`, `MonumentFiles`, `MonumentSections`, `MonumentHistories`.
- Files/assets: `Files`, `FileDatas`, `FileShares`, `Folders`, `FolderRoles`, `Assets`, `AssetFiles`, `BorrowAssets`, `Borrows`.
- Tasks/documents: `Tasks`, `TaskWorks`, `TaskUsers`, `TaskDepartments`, `TaskFiles`, `TaskResult`, `TaskDocuments`, `TaskDocument*`, `InternalDocuments`, `DocumentHistories`, `ProcessingDepartment`.
- Calendar/chat: `Calendars`, `CalendarJoins`, `CalendarFiles`, `Chats`, `ChatMessages`, `ChatUsers`, `ChatSeen`, `ChatVotes`, `ChatRemind*`.
- Rating/evaluation: `Ratings`, `RatingJobs`, `RatingParticipants`, `RatingResults`, `RatingAwardTitles`, `EvaluationCriterias`.
- System/audit/config: `Configs`, `SystemConfig`, `Settings`, `SettingsNotification`, `LogActions`, `LogLogins`, `LogLogouts`, `Notifications`, `PushNotifications`, `Maintenances`.

## Important Notes

- This conversion does not prove actual SQL Server foreign-key constraints exist; it documents the application-level relationships visible from source code.
- The Django models keep raw legacy column names such as `RoleID` and `FunctionID` to match the source tables and keep queries predictable.
- No migration files were generated for these legacy tables.
- The `.bak` file in the target project was not restored or modified.

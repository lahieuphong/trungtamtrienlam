[CmdletBinding()]
param(
    [ValidateSet('dev', 'prod')]
    [string]$Environment = 'dev',

    [string]$DumpPath,

    [string]$BackupDirectory,

    [string]$MediaSource,

    [ValidatePattern('^[A-Za-z_][A-Za-z0-9_]*$')]
    [string]$DatabaseName = 'trungtamtrienlam',

    [ValidatePattern('^[A-Za-z_][A-Za-z0-9_]*$')]
    [string]$DatabaseUser = 'trungtamtrienlam',

    [switch]$SkipMedia,

    [switch]$ConfirmDestructive
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$backendRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$repositoryRoot = [System.IO.Path]::GetFullPath((Join-Path $backendRoot '..'))

if (-not $BackupDirectory) {
    $BackupDirectory = Join-Path $repositoryRoot 'backup'
}

if (-not $MediaSource) {
    $MediaSource = Join-Path $backendRoot 'app\media'
}

$composeFileName = if ($Environment -eq 'prod') {
    'docker-compose.prod.yml'
} else {
    'docker-compose.yml'
}
$composeFile = Join-Path $backendRoot $composeFileName

if (-not (Test-Path -LiteralPath $composeFile -PathType Leaf)) {
    throw ('Compose file not found: {0}' -f $composeFile)
}

if (-not $DumpPath) {
    if (-not (Test-Path -LiteralPath $BackupDirectory -PathType Container)) {
        throw ('Backup directory not found: {0}' -f $BackupDirectory)
    }

    $latestDump = Get-ChildItem -LiteralPath $BackupDirectory -Filter '*.dump' -File |
        Sort-Object LastWriteTimeUtc -Descending |
        Select-Object -First 1

    if (-not $latestDump) {
        throw ('No .dump file found in: {0}' -f $BackupDirectory)
    }

    $DumpPath = $latestDump.FullName
}

if (-not (Test-Path -LiteralPath $DumpPath -PathType Leaf)) {
    throw ('Dump file not found: {0}' -f $DumpPath)
}
$DumpPath = (Resolve-Path -LiteralPath $DumpPath).Path

if (-not $SkipMedia) {
    if (-not (Test-Path -LiteralPath $MediaSource -PathType Container)) {
        throw ('Media source not found: {0}. Use -SkipMedia to restore only the database.' -f $MediaSource)
    }
    $MediaSource = (Resolve-Path -LiteralPath $MediaSource).Path
}

if (-not $ConfirmDestructive) {
    $message = @(
        'Restore was cancelled because it drops and recreates the selected database.'
        'Review the selected inputs, then rerun with -ConfirmDestructive.'
        ('Dump: {0}' -f $DumpPath)
        ('Compose: {0}' -f $composeFile)
        ('Database: {0}' -f $DatabaseName)
    ) -join [System.Environment]::NewLine
    throw $message
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw 'Docker CLI was not found in PATH. Start Docker Desktop and reopen PowerShell.'
}

function Assert-LastExitCode {
    param([string]$Step)

    if ($LASTEXITCODE -ne 0) {
        throw ('{0} failed with exit code {1}.' -f $Step, $LASTEXITCODE)
    }
}

$composeProjectName = if ($Environment -eq 'prod') {
    'trungtamtrienlam-backend-prod'
} else {
    'trungtamtrienlam-backend'
}
$composeArgs = @('compose', '--project-name', $composeProjectName, '--file', $composeFile)

Write-Host 'Stopping app/worker/beat so they cannot reconnect during the restore...'
& docker @composeArgs stop app celery_worker celery_beat
Assert-LastExitCode 'Stopping application services'

Write-Host 'Starting the isolated PostgreSQL service...'
& docker @composeArgs up --detach --wait postgres
Assert-LastExitCode 'Starting PostgreSQL'

$containerId = (& docker @composeArgs ps --quiet postgres).Trim()
Assert-LastExitCode 'Finding the PostgreSQL container'
if (-not $containerId) {
    throw 'The PostgreSQL container was not found.'
}

$pgRestoreVersion = (& docker exec $containerId pg_restore --version).Trim()
Assert-LastExitCode 'Checking pg_restore'
if ($pgRestoreVersion -notmatch 'PostgreSQL\) 16\.') {
    throw ('PostgreSQL 16 pg_restore is required, but the container reported: {0}' -f $pgRestoreVersion)
}

$containerDump = '/tmp/trungtamtrienlam-restore.dump'

try {
    Write-Host 'Copying dump into PostgreSQL 16 container...'
    & docker cp $DumpPath ('{0}:{1}' -f $containerId, $containerDump)
    Assert-LastExitCode 'Copying the dump'

    Write-Host 'Validating the dump before changing the database...'
    & docker exec $containerId pg_restore --list $containerDump > $null
    Assert-LastExitCode 'Validating the dump'

    Write-Host ('Dropping and recreating only database ''{0}'' in the selected Compose project...' -f $DatabaseName)
    $terminateSql = 'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = ''{0}'' AND pid <> pg_backend_pid();' -f $DatabaseName
    & docker exec $containerId psql --username $DatabaseUser --dbname postgres --set ON_ERROR_STOP=on --command $terminateSql
    Assert-LastExitCode 'Terminating database connections'

    & docker exec $containerId dropdb --username $DatabaseUser --if-exists $DatabaseName
    Assert-LastExitCode 'Dropping the database'

    & docker exec $containerId createdb --username $DatabaseUser --owner $DatabaseUser $DatabaseName
    Assert-LastExitCode 'Creating the clean database'

    Write-Host ('Restoring with {0}...' -f $pgRestoreVersion)
    & docker exec $containerId pg_restore --username $DatabaseUser --dbname $DatabaseName --no-owner --no-privileges --exit-on-error $containerDump
    Assert-LastExitCode 'Restoring the database'
}
finally {
    & docker exec $containerId rm -f $containerDump 2>$null
}

if (-not $SkipMedia) {
    $appRoot = [System.IO.Path]::GetFullPath((Join-Path $backendRoot 'app'))
    $mediaTarget = [System.IO.Path]::GetFullPath((Join-Path $backendRoot 'app\media'))
    $appRootPrefix = $appRoot.TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar
    if (-not $mediaTarget.StartsWith($appRootPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw ('Refusing to copy media outside the app/media directory: {0}' -f $mediaTarget)
    }

    $sameMediaDirectory = [System.String]::Equals(
        [System.IO.Path]::GetFullPath($MediaSource),
        $mediaTarget,
        [System.StringComparison]::OrdinalIgnoreCase
    )
    if ($sameMediaDirectory) {
        Write-Host ('Media is already present in the target: {0}' -f $mediaTarget)
    } else {
        New-Item -ItemType Directory -Path $mediaTarget -Force | Out-Null
        Write-Host ('Merging media into: {0}' -f $mediaTarget)
        Get-ChildItem -LiteralPath $MediaSource -Force | ForEach-Object {
            Copy-Item -LiteralPath $_.FullName -Destination $mediaTarget -Recurse -Force
        }
    }
}

Write-Host 'Restore completed successfully.'
Write-Host ('Database dump: {0}' -f $DumpPath)
if (-not $SkipMedia) {
    Write-Host ('Media source: {0}' -f $MediaSource)
}
Write-Host 'No Docker volume was removed.'

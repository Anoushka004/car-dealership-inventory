param([string]$Path = (Join-Path $PSScriptRoot '..\.env'))
$ErrorActionPreference = 'Stop'
foreach ($line in Get-Content -LiteralPath $Path) {
    if ($line -match '^\s*(#|$)') { continue }
    if ($line -notmatch '^([A-Z][A-Z0-9_]*)=(.*)$') { throw 'Invalid .env entry; use unquoted NAME=value lines.' }
    [Environment]::SetEnvironmentVariable($Matches[1], $Matches[2], 'Process')
}

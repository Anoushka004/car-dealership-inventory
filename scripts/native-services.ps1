param(
    [Parameter(Mandatory)][ValidateSet('Start','Stop')][string]$Action,
    [Parameter(Mandatory)][string]$PgBin,
    [Parameter(Mandatory)][string]$MailpitExe,
    [ValidateRange(1024,65535)][int]$PostgresPort = 5432,
    [ValidateRange(1024,65535)][int]$SmtpPort = 1025,
    [ValidateRange(1024,65535)][int]$MailpitPort = 8025
)
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$state = Join-Path $repo '.local-state'
$data = Join-Path $state 'postgres'
$pgExecutable = (Resolve-Path -LiteralPath (Join-Path $PgBin 'postgres.exe')).Path
$mailExecutable = (Resolve-Path -LiteralPath $MailpitExe).Path
$mailPidFile = Join-Path $state 'mailpit-process.json'
if ($Action -eq 'Stop') {
    & (Join-Path $PgBin 'pg_ctl.exe') -D $data -m fast -w -t 15 stop
    $postgresStopped = $LASTEXITCODE -eq 0
    if (Test-Path -LiteralPath $mailPidFile) {
        $record = Get-Content -LiteralPath $mailPidFile -Raw | ConvertFrom-Json
        $mailProcess = Get-Process -Id $record.Id -ErrorAction SilentlyContinue
        if ($mailProcess -and $mailProcess.Path -eq $mailExecutable -and $mailProcess.StartTime.ToUniversalTime().Ticks -eq $record.StartedTicks) { Stop-Process -Id $mailProcess.Id }
    }
    if (-not $postgresStopped) { throw 'PostgreSQL shutdown failed.' }
    return
}
if (@($PostgresPort,$SmtpPort,$MailpitPort | Select-Object -Unique).Count -ne 3) { throw 'Each service must have its own port.' }
foreach ($port in @($PostgresPort,$SmtpPort,$MailpitPort)) {
    $listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, $port)
    try { $listener.Start() } catch { throw "Port $port is already in use; no services were started." } finally { $listener.Stop() }
}
New-Item -ItemType Directory -Path $state -Force | Out-Null
if (-not (Test-Path -LiteralPath (Join-Path $data 'PG_VERSION'))) {
    if (-not $env:POSTGRES_PASSWORD) { throw 'Set POSTGRES_PASSWORD before initializing the local cluster.' }
    $passwordFile = Join-Path $state 'init-password.tmp'
    try {
        [IO.File]::WriteAllText($passwordFile, $env:POSTGRES_PASSWORD)
        & (Join-Path $PgBin 'initdb.exe') -D $data -U postgres -A scram-sha-256 --encoding=UTF8 --locale=C --pwfile=$passwordFile
        if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL initialization failed.' }
    } finally {
        if (Test-Path -LiteralPath $passwordFile) { Remove-Item -LiteralPath $passwordFile }
    }
}
$pg = $null
$mail = $null
try {
$pg = Start-Process -FilePath $pgExecutable -ArgumentList @('-D',('"' + $data + '"'),'-h','127.0.0.1','-p',"$PostgresPort") -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $state 'postgres.out.log') -RedirectStandardError (Join-Path $state 'postgres.err.log')
$deadline = [DateTime]::UtcNow.AddSeconds(20)
do {
    & (Join-Path $PgBin 'pg_isready.exe') -h 127.0.0.1 -p $PostgresPort -U postgres -q
    if ($LASTEXITCODE -eq 0 -and -not $pg.HasExited) { break }
    if ($pg.HasExited -or [DateTime]::UtcNow -gt $deadline) { throw 'PostgreSQL did not become ready; inspect .local-state logs.' }
    Start-Sleep -Milliseconds 100
} while ($true)
$mail = Start-Process -FilePath $mailExecutable -ArgumentList @('--smtp',"127.0.0.1:$SmtpPort",'--listen',"127.0.0.1:$MailpitPort",'--database',('"' + (Join-Path $state 'mailpit.db') + '"')) -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $state 'mailpit.out.log') -RedirectStandardError (Join-Path $state 'mailpit.err.log')
@{ Id = $mail.Id; StartedTicks = $mail.StartTime.ToUniversalTime().Ticks } | ConvertTo-Json | Set-Content -LiteralPath $mailPidFile
$deadline = [DateTime]::UtcNow.AddSeconds(20)
do {
    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$MailpitPort/livez" -TimeoutSec 1
        if ($response.StatusCode -eq 200) { break }
    } catch {}
    if ($mail.HasExited -or [DateTime]::UtcNow -gt $deadline) { throw 'Mailpit did not become ready; inspect .local-state logs.' }
    Start-Sleep -Milliseconds 100
} while ($true)
Write-Output 'Isolated native PostgreSQL and Mailpit are ready on loopback.'
} catch {
    if ($mail -and -not $mail.HasExited) { Stop-Process -Id $mail.Id -ErrorAction SilentlyContinue }
    if ($pg -and -not $pg.HasExited) { & (Join-Path $PgBin 'pg_ctl.exe') -D $data -m fast -w -t 15 stop | Out-Null }
    throw
}

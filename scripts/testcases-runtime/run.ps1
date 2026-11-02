param([Parameter(Mandatory=$true)][string]$PlanPath)
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot '../Testcases.Local.Common.ps1')
$p=Get-TestcasePaths
$node=Resolve-TestcaseRuntime 'Node'
$python=Resolve-TestcaseRuntime 'Python'
$env:SPN_REPORT_PYTHON=$python
$env:NODE_OPTIONS='--max-old-space-size=512'
$env:CI=''
foreach($name in @('SPN_GCL_ALLOW_TRANSMIT','SPN_GCL_ENABLE_SEND_GUARD','SPN_EXPORT_ALLOW_TRANSMIT','SPN_EXPORT_ALLOW_CANCEL')){Set-Item -LiteralPath ('Env:'+ $name) -Value '0'}
$stages=@(Get-TestcasePlanStages (Get-Content -LiteralPath $PlanPath -Raw -Encoding utf8 | ConvertFrom-Json))
$excludedFile=Join-Path $PSScriptRoot 'excluded-cases.json'
$excluded=if(Test-Path -LiteralPath $excludedFile){@((Get-Content -LiteralPath $excludedFile -Raw -Encoding utf8 | ConvertFrom-Json).ids)}else{@()}
foreach($stage in $stages){$stage.ids=@($stage.ids|Where-Object {$_ -notin $excluded})}
$mutex=[Threading.Mutex]::new($false,(Get-TestcaseMutexName 'Runner' $p.Project))
$owns=$false;$complete=$false;$original=(Get-Location).Path
function Status([string]$State,[int]$Pending=0,[string]$Stage=''){
 Write-TestcaseJsonAtomic (Join-Path $p.Run 'status.json') @{state=$State;unattempted=$Pending;module=$Stage;planStage=$Stage;runnerPid=$PID;updatedAt=[DateTime]::UtcNow.ToString('o');execution='LOCAL'}
}
try{
 try{$owns=$mutex.WaitOne(0)}catch [Threading.AbandonedMutexException]{$owns=$true}
 if(-not $owns){throw 'Another runner is active'}
 Set-Location -LiteralPath $p.Tests
 # Existing test fixtures write their own ledgers here; their flow is unchanged.
 New-Item -ItemType Directory -Force -Path (Join-Path $p.Project 'ai-support/evidence') | Out-Null
 foreach($stage in $stages){
  if($stage.name -notmatch '^[a-z0-9][a-z0-9-]{0,95}$' -or $stage.project -notin @('functional','export','gcl') -or $stage.transmit){throw 'Invalid or transmit-enabled stage'}
  if(@($stage.ids|Where-Object {$_ -notmatch '^[A-Z0-9-]+$'}).Count){throw 'Invalid case ID'}
  $done=Get-AttemptedTestcaseIds $p.Run $stage.name
  $pending=@($stage.ids|Where-Object {-not $done.Contains([string]$_)})
  if(-not $pending.Count){continue}
  $name=$stage.name
  if(Test-Path -LiteralPath (Join-Path $p.Run $name)){$name+='-resume-'+[DateTime]::UtcNow.ToString('yyyyMMdd-HHmmssfff')}
  $folder=Join-Path $p.Run $name
  New-Item -ItemType Directory -Path $folder | Out-Null
  $env:PW_OUTPUT_DIR=Join-Path $folder 'artifacts'
  $env:PW_RESULTS_FILE=Join-Path $folder 'results.json'
  $env:PW_INCREMENTAL_FILE=Join-Path $folder 'incremental.jsonl'
  Status 'DEBUG_RUNNING' $pending.Count $name
  $patterns=@($pending|ForEach-Object {if($_ -eq 'OTHER-REPORT-IMPORT'){'Other Report.*Import Report'}else{[regex]::Escape($_)+':'}})
  $pwArgs=@('-r','./scripts/prepare-gcl-local.cjs','node_modules/@playwright/test/cli.js','test','--config',(Join-Path $PSScriptRoot 'run.config.ts'),('--project='+$stage.project),'--grep',('(?:'+($patterns -join '|')+')'),'--headed','--workers=1','--retries=0','--trace=retain-on-failure')
  Write-Host "Running $name ($($pending.Count) cases)"
  & $node @pwArgs 2>&1 | ForEach-Object {[regex]::Replace([string]$_,'(?i)(UCODE|PHPSESSID)=([^&\s"<>]+)','$1=[redacted]')} | Tee-Object -FilePath (Join-Path $folder 'run.log')
  $code=$LASTEXITCODE
  Write-Host "Finished $name exit=$code"
  $done=Get-AttemptedTestcaseIds $p.Run $stage.name
  if(@($stage.ids|Where-Object {-not $done.Contains([string]$_)}).Count){break}
 }
 $missing=0
 foreach($stage in $stages){$done=Get-AttemptedTestcaseIds $p.Run $stage.name;$missing+=@($stage.ids|Where-Object {-not $done.Contains([string]$_)}).Count}
 $state=if($missing){'DEBUG_INCOMPLETE'}else{'DEBUG_COMPLETE'}
 Status $state $missing
 Update-TestcaseReport $p $python
 $complete=$true
 if($missing){Write-Warning "$missing cases could not start. Resolve setup and use Continue."}
}finally{
 if($owns){if(-not $complete){Status 'DEBUG_STOPPED';try{Update-TestcaseReport $p $python}catch{}};$mutex.ReleaseMutex()}
 $mutex.Dispose();Set-Location -LiteralPath $original
}

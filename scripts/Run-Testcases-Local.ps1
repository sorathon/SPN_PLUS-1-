param(
    [ValidateSet('Continue','All','GclAll','GclFailed','ImportMapping','GclDat','GclWorkspaceCsv','Range')][string]$Mode = 'Continue',
    [Parameter(Position=0)][string]$StartCase,
    [Parameter(Position=1)][string]$EndCase,
    [switch]$Menu,
    [switch]$ViewOnly,
    [switch]$CheckOnly,
    [switch]$NoOpen
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'Testcases.Local.Common.ps1')
$paths = Get-TestcasePaths
if ($StartCase -or $EndCase) {
    if ($PSBoundParameters.ContainsKey('Mode') -and $Mode -ne 'Range') { throw 'Use case IDs alone or with -Mode Range.' }
    $Mode = 'Range'
}
if ($Menu -and -not $CheckOnly) {
    Write-Host 'SPN PLUS - local test runner'
    Write-Host '1. Continue unfinished cases / planned rechecks'
    Write-Host '2. Start a new GCL run (all current cases)'
    Write-Host '3. Rerun failed GCL cases'
    Write-Host '4. View the live HTML report only'
    Write-Host '5. Start a new complete run: Import -> Export -> GCL'
    Write-Host '6. Run Import Add Invoice Mapping cases only'
    Write-Host '7. Upload supplied GCL DAT (TC-GCL-157)'
    Write-Host '8. Upload CSV inside GCL Ref (TC-GCL-180 to 182)'
    Write-Host '9. Run a case range (start ID -> end ID)'
    switch (Read-Host 'Select 1-9') {
        '1' { $Mode = 'Continue' }
        '2' { $Mode = 'GclAll' }
        '3' { $Mode = 'GclFailed' }
        '4' { $ViewOnly = $true }
        '5' { $Mode = 'All' }
        '6' { $Mode = 'ImportMapping' }
        '7' { $Mode = 'GclDat' }
        '8' { $Mode = 'GclWorkspaceCsv' }
        '9' {
            $Mode = 'Range'
            $StartCase = Read-Host 'Start case (e.g. TC-FUNC-001)'
            $EndCase = Read-Host 'End case (e.g. TC-FUNC-126; blank = last case of this prefix)'
        }
        default { throw 'Select a number from 1 to 9.' }
    }
}

if ($ViewOnly -and -not $CheckOnly) {
    if(-not (Test-Path -LiteralPath $paths.Report)){throw 'The HTML report does not exist yet.'}
    if(-not $NoOpen){Start-Process -FilePath $paths.Report | Out-Null}
    Write-Host $paths.Report
    return
}
$node = Resolve-TestcaseRuntime 'Node'
$python = Resolve-TestcaseRuntime 'Python'
if (-not (Test-Path -LiteralPath (Join-Path $paths.Tests 'node_modules/@playwright/test/cli.js'))) { throw 'Run npm ci in the tests folder first.' }

$active = @(Get-ActiveTestcaseProcesses $paths)
$report = Get-Content -LiteralPath $paths.Results -Raw -Encoding utf8 | ConvertFrom-Json
if ($Mode -eq 'Continue') {
    $planFile = if (Test-Path -LiteralPath $paths.LocalPlan) { $paths.LocalPlan } else { $paths.Plan }
    $planDocument = Get-Content -LiteralPath $planFile -Raw -Encoding utf8 | ConvertFrom-Json
    $plan = @(Get-TestcasePlanStages $planDocument)
    $pending = 0
    foreach ($stage in $plan) {
        $done = Get-AttemptedTestcaseIds $paths.Run $stage.name
        $pending += @($stage.ids | Where-Object { -not $done.Contains([string]$_) }).Count
    }
} else {
    $selected = @(Select-LocalTestcaseRows $report.rows $Mode $StartCase $EndCase)
    $pending = $selected.Count
}
if ($CheckOnly) {
    $selection = if ($Mode -eq 'Range') { @($selected.id) } else { @() }
    [pscustomobject]@{mode=$Mode;plannedCases=$pending;selectedIds=$selection;activeProcesses=$active.Count;node=$node;python=$python;report=$paths.Report;startsTests=$false} | ConvertTo-Json
    return
}

Update-TestcaseReport $paths $python
if (-not $NoOpen) { Start-Process -FilePath $paths.Report | Out-Null }
if ($ViewOnly) { return }

$mutex = [Threading.Mutex]::new($false, (Get-TestcaseMutexName 'LocalLauncher' $paths.Project))
$owns = $false
try {
    try { $owns = $mutex.WaitOne(0) } catch [Threading.AbandonedMutexException] { $owns = $true }
    if (-not $owns) { Write-Host 'A local launcher is already running. The report has been opened.'; return }
    $last = ''
    while (@(Get-ActiveTestcaseProcesses $paths).Count) {
        $statusFile = Join-Path $paths.Run 'status.json'
        try {
            $status = Get-Content -LiteralPath $statusFile -Raw -Encoding utf8 | ConvertFrom-Json
            $current = "$($status.state) / $($status.module)"
        } catch { $current = 'Waiting for the existing test runner' }
        if ($current -ne $last) { Write-Host "Existing run: $current. No second run will start."; $last = $current }
        Start-Sleep -Seconds 5
    }

    if ($Mode -ne 'Continue') {
        # Select again after the existing run finishes so Failed uses its latest results.
        Update-TestcaseReport $paths $python
        $report = Get-Content -LiteralPath $paths.Results -Raw -Encoding utf8 | ConvertFrom-Json
        $selected = @(Select-LocalTestcaseRows $report.rows $Mode $StartCase $EndCase)
        if (-not $selected.Count) { Write-Host 'No cases match this selection.'; return }
        $key = 'valid-local-' + [DateTime]::UtcNow.ToString('yyyyMMdd-HHmmssfff')
        $plan = @(New-LocalTestcaseStages $selected $key)
        $label = if ($Mode -eq 'Range') { 'Range '+$selected[0].id+' to '+$selected[-1].id } else { $Mode }
        Write-Host ('Selected '+$selected.Count+' cases: '+$selected[0].id+' -> '+$selected[-1].id)
        Write-TestcaseJsonAtomic $paths.LocalPlan @{stages=$plan;selectedIds=@($selected.id);startedAt=[DateTime]::UtcNow.ToString('o');label=$label}
        $planFile = $paths.LocalPlan
    } else {
        $planFile = if (Test-Path -LiteralPath $paths.LocalPlan) { $paths.LocalPlan } else { $paths.Plan }
    }
    $env:SPN_NODE_EXE = $node
    $env:SPN_REPORT_PYTHON = $python
    $env:SPN_LOCAL_RUN = '1'
    Write-Host 'Tests run locally with Node/Playwright. The HTML refreshes every 15 seconds.'
    & (Join-Path $paths.Runtime 'run.ps1') -PlanPath $planFile
    Write-Host "Finished. Actual pass/fail/skip results: $($paths.Report)"
} finally {
    if ($owns) { $mutex.ReleaseMutex() }
    $mutex.Dispose()
}


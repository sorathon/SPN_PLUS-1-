function Get-TestcasePaths {
    $projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
    $runRoot = Join-Path $projectRoot 'report testcase update/runs'
    [pscustomobject]@{
        Project = $projectRoot
        Tests = Join-Path $projectRoot 'tests'
        Run = $runRoot
        Runtime = Join-Path $projectRoot 'scripts/testcases-runtime'
        Plan = Join-Path $runRoot 'stages.json'
        LocalPlan = Join-Path $runRoot 'local-active-plan.json'
        Mode = Join-Path $runRoot 'local-report-mode.json'
        Generator = Join-Path $projectRoot 'scripts/testcases-runtime/report.py'
        Results = Join-Path $projectRoot 'report testcase update/data/short-results.json'
        Report = Join-Path $projectRoot 'report testcase update/TESTCASES_ALL_SHORT_20261030.html'
    }
}

function Resolve-TestcaseRuntime([string]$Kind) {
    $runtimeRoot = Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies'
    if ($Kind -eq 'Node') {
        $override = $env:SPN_NODE_EXE
        $bundled = Join-Path $runtimeRoot 'node/bin/node.exe'
        $names = @('node')
    } else {
        $override = $env:SPN_REPORT_PYTHON
        $bundled = Join-Path $runtimeRoot 'python/python.exe'
        $names = @('python', 'python3')
    }
    if ($override) {
        if (-not (Test-Path -LiteralPath $override -PathType Leaf)) { throw "$Kind executable not found: $override" }
        return $override
    }
    if (Test-Path -LiteralPath $bundled -PathType Leaf) { return $bundled }
    foreach ($name in $names) {
        $command = Get-Command $name -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($command) { return $command.Source }
    }
    throw "$Kind is required. Install it or configure SPN_NODE_EXE / SPN_REPORT_PYTHON."
}

function Get-TestcaseMutexName([string]$Purpose, [string]$Root) {
    $sha = [Security.Cryptography.SHA256]::Create()
    try { $hash = [BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($Root.ToLowerInvariant()))).Replace('-', '').Substring(0, 16) }
    finally { $sha.Dispose() }
    return "Local\SPNPlus-$Purpose-$hash"
}

function Get-TestcasePlanStages($Document) {
    if($Document -is [array]){$Document;return}
    if($Document.PSObject.Properties['stages']){$Document.stages;return}
    $Document
}

function Select-LocalTestcaseRows($Rows, [string]$Mode, [string]$StartCase, [string]$EndCase) {
    if ($Mode -eq 'Range') {
        $startId = ([string]$StartCase).Trim().ToUpperInvariant()
        $endId = ([string]$EndCase).Trim().ToUpperInvariant()
        $pattern = '^(?<prefix>TC-[A-Z]+-(?:NEW-)?)(?<number>[0-9]{1,6})$'
        $start = [regex]::Match($startId,$pattern)
        if (-not $start.Success) { throw 'Enter a valid start case, e.g. TC-FUNC-001.' }
        $prefix = $start.Groups['prefix'].Value
        $first = [int]$start.Groups['number'].Value
        $candidates = @($Rows | Where-Object { $_.id -match ('^'+[regex]::Escape($prefix)+'[0-9]+$') } | Sort-Object { [int]($_.id.Substring($prefix.Length)) })
        if (-not @($candidates | Where-Object { [int]($_.id.Substring($prefix.Length)) -eq $first }).Count) { throw "Start case $startId does not exist in the report." }
        if ($endId) {
            $end = [regex]::Match($endId,$pattern)
            if (-not $end.Success -or $end.Groups['prefix'].Value -ne $prefix) { throw 'Start and end must have the same prefix (TC-FUNC, TC-EXP, TC-GCL or TC-GCL-NEW).' }
            $last = [int]$end.Groups['number'].Value
            if ($last -lt $first) { throw 'End case must be greater than or equal to start case.' }
            if (-not @($candidates | Where-Object { [int]($_.id.Substring($prefix.Length)) -eq $last }).Count) { throw "End case $endId does not exist in the report." }
        } else { $last = [int]($candidates[-1].id.Substring($prefix.Length)) }
        $candidates | Where-Object { $number=[int]($_.id.Substring($prefix.Length)); $number -ge $first -and $number -le $last }
        return
    }
    if ($Mode -eq 'GclWorkspaceCsv') {
        $Rows | Where-Object { $_.module -eq 'GCL' -and $_.id -match '^TC-GCL-18[0-2]$' }
        return
    }
    if ($Mode -eq 'GclDat') {
        $Rows | Where-Object { $_.module -eq 'GCL' -and $_.id -eq 'TC-GCL-157' }
        return
    }
    if ($Mode -eq 'ImportMapping') {
        $Rows | Where-Object { $_.module -eq 'IMPORT' -and $_.id -match '^TC-FUNC-12[0-6]$' }
        return
    }
    foreach ($module in @('Import','Export','GCL')) {
        if ($Mode -ne 'All' -and $module -ne 'GCL') { continue }
        $Rows | Where-Object { $_.module -eq $module -and ($Mode -ne 'GclFailed' -or $_.result -eq 'ไม่ผ่าน') }
    }
}

function New-LocalTestcaseStages($Rows, [string]$Key) {
    $projects = @{ Import='functional'; Export='export'; GCL='gcl' }
    $number = 0
    foreach ($module in @('Import','Export','GCL')) {
        $group = @($Rows | Where-Object { $_.module -eq $module })
        for ($i=0; $i -lt $group.Count; $i+=12) {
            $number++
            $lastIndex = [Math]::Min($i+11,$group.Count-1)
            @{name=($Key+'-'+$number.ToString('00'));project=$projects[$module];ids=@($group[$i..$lastIndex] | ForEach-Object {$_.id});transmit=$false}
        }
    }
}

function Get-ActiveTestcaseProcesses($Paths) {
    # Do not fall back to an incomplete process listing: that could start a second login owner.
    $needle = $Paths.Project.Replace('/', '\').ToLowerInvariant()
    $processes = Get-CimInstance Win32_Process -ErrorAction Stop
    @($processes | Where-Object {
        if ($_.ProcessId -eq $PID -or -not $_.CommandLine) { return $false }
        $line = $_.CommandLine.Replace('/', '\').ToLowerInvariant()
        if (-not $line.Contains($needle)) { return $false }
        ($_.Name -eq 'node.exe' -and $line -match 'playwright.*(cli|program)') -or
        # Local launchers coordinate through their mutex. An idle -Menu prompt
        # owns no test session and must not block another launcher indefinitely.
        ($_.Name -match '^(pwsh|powershell)\.exe$' -and $line -match '(?s)(testcases-runtime.*run\.ps1|debug-20261030.*run\.ps1|regression-fresh-20261030-0818.*run-all\.ps1)')
    })
}

function Update-TestcaseReport($Paths, [string]$Python) {
    & $Python $Paths.Generator
    if ($LASTEXITCODE -ne 0) { throw 'The HTML report could not be updated.' }
}

function Write-TestcaseJsonAtomic([string]$Path, $Value) {
    $target=[IO.Path]::GetFullPath($Path)
    $temp=$target+'.tmp-'+[guid]::NewGuid().ToString('N')
    try {
        [IO.File]::WriteAllText($temp,($Value|ConvertTo-Json -Depth 10),[Text.UTF8Encoding]::new($false))
        for($attempt=0;$attempt -lt 10;$attempt++){
            try {
                if([IO.File]::Exists($target)){[IO.File]::Replace($temp,$target,[NullString]::Value)}else{[IO.File]::Move($temp,$target)}
                break
            }catch [IO.IOException]{if($attempt -eq 9){throw};Start-Sleep -Milliseconds 200}
        }
    } finally {if([IO.File]::Exists($temp)){Remove-Item -LiteralPath $temp -Force}}
}

function Get-AttemptedTestcaseIds([string]$RunRoot, [string]$StageName) {
    $done = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
    $dirs = @()
    $original = Join-Path $RunRoot $StageName
    if (Test-Path -LiteralPath $original -PathType Container) { $dirs += Get-Item -LiteralPath $original }
    $dirs += @(Get-ChildItem -LiteralPath $RunRoot -Directory -Filter "$StageName-resume-*" -ErrorAction SilentlyContinue)
    foreach ($dir in $dirs) {
        $incremental = Join-Path $dir.FullName 'incremental.jsonl'
        if (Test-Path -LiteralPath $incremental) {
            foreach ($line in Get-Content -LiteralPath $incremental -Encoding utf8) {
                try { $row = $line | ConvertFrom-Json -ErrorAction Stop } catch { continue }
                $explicitSkip = @($row.annotations | Where-Object type -eq 'skip').Count -gt 0
                if ($row.id -and ($row.status -in @('passed','failed','timedOut') -or ($row.status -eq 'skipped' -and $explicitSkip))) {
                    [void]$done.Add([string]$row.id)
                }
            }
        }
        $json = Join-Path $dir.FullName 'results.json'
        if (Test-Path -LiteralPath $json) {
            try { $data = Get-Content -LiteralPath $json -Raw -Encoding utf8 | ConvertFrom-Json -ErrorAction Stop } catch { continue }
            $queue = [Collections.Generic.Queue[object]]::new()
            foreach ($suite in $data.suites) { $queue.Enqueue($suite) }
            while ($queue.Count) {
                $suite = $queue.Dequeue()
                foreach ($child in $suite.suites) { $queue.Enqueue($child) }
                foreach ($spec in $suite.specs) {
                    if ($spec.title -notmatch '^([A-Z0-9-]+):') { continue }
                    $id = $Matches[1]
                    foreach ($testResult in $spec.tests) {
                        if (-not $testResult.results) { continue }
                        $result = @($testResult.results)[-1]
                        $explicitSkip = @(@($testResult.annotations)+@($result.annotations) | Where-Object type -eq 'skip').Count -gt 0
                        if ($result.status -in @('passed','failed','timedOut') -or ($result.status -eq 'skipped' -and $explicitSkip)) { [void]$done.Add($id) }
                    }
                }
            }
        }
    }
    Write-Output -NoEnumerate $done
}


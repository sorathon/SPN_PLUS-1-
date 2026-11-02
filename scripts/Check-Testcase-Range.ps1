$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'Testcases.Local.Common.ps1')
$rows=@(
    [pscustomobject]@{id='TC-FUNC-126';module='IMPORT'},
    [pscustomobject]@{id='TC-FUNC-010';module='IMPORT'},
    [pscustomobject]@{id='TC-EXP-001';module='EXPORT'},
    [pscustomobject]@{id='TC-FUNC-001';module='IMPORT'},
    [pscustomobject]@{id='TC-GCL-NEW-001';module='GCL'},
    [pscustomobject]@{id='TC-GCL-001';module='GCL'}
)
function Assert-Ids($Selected,[string]$Expected) {
    $actual=@($Selected | ForEach-Object {$_.id}) -join ','
    if($actual -ne $Expected){throw "Expected $Expected; got $actual"}
}
Assert-Ids @(Select-LocalTestcaseRows $rows 'Range' ' tc-func-001 ' 'TC-FUNC-126') 'TC-FUNC-001,TC-FUNC-010,TC-FUNC-126'
Assert-Ids @(Select-LocalTestcaseRows $rows 'Range' 'TC-FUNC-010' '') 'TC-FUNC-010,TC-FUNC-126'
Assert-Ids @(Select-LocalTestcaseRows $rows 'Range' 'TC-FUNC-010' 'TC-FUNC-010') 'TC-FUNC-010'
Assert-Ids @(Select-LocalTestcaseRows $rows 'Range' 'TC-GCL-001' '') 'TC-GCL-001'
Assert-Ids @(Select-LocalTestcaseRows $rows 'Range' 'TC-GCL-NEW-001' '') 'TC-GCL-NEW-001'
foreach($pair in @(
    @('TC-FUNC-126','TC-FUNC-001'),
    @('TC-FUNC-001','TC-EXP-001'),
    @('TC-FUNC-002','TC-FUNC-126'),
    @('TC-FUNC-001','TC-FUNC-999'),
    @('','TC-FUNC-126'),
    @('TC-FUNC-001','invalid')
)){
    $rejected=$false
    try {$null=@(Select-LocalTestcaseRows $rows 'Range' $pair[0] $pair[1])}catch{$rejected=$true}
    if(-not $rejected){throw "Invalid range accepted: $($pair -join ' -> ')"}
}
$paths=Get-TestcasePaths
$report=Get-Content -LiteralPath $paths.Results -Raw -Encoding utf8 | ConvertFrom-Json
$selected=@(Select-LocalTestcaseRows $report.rows 'Range' 'TC-FUNC-001' 'TC-FUNC-126')
if($selected[0].id -ne 'TC-FUNC-001' -or $selected[-1].id -ne 'TC-FUNC-126'){throw 'Real range endpoints differ'}
if(@($selected|Where-Object {$_.module -ne 'IMPORT' -or $_.id -notmatch '^TC-FUNC-'}).Count){throw 'Range includes unrelated cases'}
$plan=@(New-LocalTestcaseStages $selected 'verify-range')
Assert-Ids @($plan | ForEach-Object {$_.ids} | ForEach-Object {[pscustomobject]@{id=$_}}) ($selected.id -join ',')
if(@($plan|Where-Object {$_.project -ne 'functional' -or $_.ids.Count -gt 12}).Count){throw 'Invalid range plan'}
Write-Output "PASS: numeric inclusive ranges, gaps, prefix isolation, omitted end, invalid ranges and plan batching. Real Import range: $($selected.Count) cases. No live tests or file writes."

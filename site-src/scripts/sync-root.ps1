<#
    sync-root.ps1

    Publishes the built static site from site-src/dist into the worktree root so
    GitHub Pages can serve the branch root at /CopilotScope/.

    Behavior:
      1. Builds the site (npm run build in site-src) unless -DryRun is given.
      2. Copies every file from site-src/dist/* into the worktree root, preserving
         the relative directory layout.
      3. Maintains root-manifest.json at the worktree root: a list of every file
         (relative path) that this script placed at the root.
      4. On each run, removes from the root any file that was present in the
         PREVIOUS manifest but is no longer produced by the current build, then
         prunes any directories that become empty as a result.
      5. Never touches the authoring source or branch scaffolding. The following
         root entries are protected and are neither copied over nor deleted:
         site-src/, .gitignore, .nojekyll, .git/, root-manifest.json, LICENSE,
         SECURITY.md.
      6. -DryRun reports every copy / delete / rmdir it would perform and changes
         nothing on disk (the build is skipped so the working tree is untouched).
#>

[CmdletBinding()]
param(
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

$scriptDir = $PSScriptRoot
$siteSrc = Split-Path -Parent $scriptDir
$root = Split-Path -Parent $siteSrc
$dist = Join-Path $siteSrc 'dist'
$manifestPath = Join-Path $root 'root-manifest.json'

# Top-level root entries this script must never copy over or delete.
$protected = @('.git', '.gitignore', '.nojekyll', 'root-manifest.json', 'LICENSE', 'SECURITY.md', 'site-src', 'config')

function Get-TopSegment([string]$rel) {
    return ($rel -split '/')[0]
}

# --- 1. Build (skipped in DryRun so the working tree is untouched) ---
if ($DryRun) {
    Write-Host '[DryRun] Skipping build; reporting against the existing dist/.'
} else {
    Write-Host 'Building site (npm run build)...'
    npm --prefix $siteSrc run build
    if ($LASTEXITCODE -ne 0) {
        throw "Build failed with exit code $LASTEXITCODE."
    }
}

if (-not (Test-Path -LiteralPath $dist)) {
    throw "dist not found at '$dist'. Run without -DryRun to build first."
}

# --- Read previous manifest ---
$prev = @()
if (Test-Path -LiteralPath $manifestPath) {
    try {
        $json = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
        if ($null -ne $json.files) { $prev = @($json.files) }
    } catch {
        Write-Warning "Could not parse existing manifest; treating as empty."
        $prev = @()
    }
}

# --- Enumerate current dist files as forward-slash relative paths ---
$distFiles = Get-ChildItem -LiteralPath $dist -Recurse -File -Force
$current = @(
    foreach ($f in $distFiles) {
        $f.FullName.Substring($dist.Length).TrimStart('\', '/').Replace('\', '/')
    }
) | Sort-Object -Unique

# --- 2. Copy dist -> root ---
$copied = 0
foreach ($rel in $current) {
    if ($protected -contains (Get-TopSegment $rel)) { continue }
    $srcFile = Join-Path $dist ($rel -replace '/', '\')
    $dstFile = Join-Path $root ($rel -replace '/', '\')
    if ($DryRun) {
        Write-Host "[DryRun] COPY  $rel"
    } else {
        $dstDir = Split-Path -Parent $dstFile
        if (-not (Test-Path -LiteralPath $dstDir)) {
            New-Item -ItemType Directory -Force -Path $dstDir | Out-Null
        }
        Copy-Item -LiteralPath $srcFile -Destination $dstFile -Force
    }
    $copied++
}

# --- 4. Delete files that dropped out of the build since the last manifest ---
$stale = @($prev | Where-Object { $current -notcontains $_ })
$deleted = 0
foreach ($rel in $stale) {
    if ($protected -contains (Get-TopSegment $rel)) { continue }
    $target = Join-Path $root ($rel -replace '/', '\')
    if (Test-Path -LiteralPath $target) {
        if ($DryRun) {
            Write-Host "[DryRun] DELETE $rel"
        } else {
            Remove-Item -LiteralPath $target -Force
        }
        $deleted++
    }
}

# --- Prune directories emptied by this sync (only within the sync tree) ---
$syncDirs = New-Object System.Collections.Generic.HashSet[string]
foreach ($rel in @($current + $prev)) {
    $parts = $rel -split '/'
    if ($parts.Count -gt 1) {
        for ($i = 1; $i -lt $parts.Count; $i++) {
            [void]$syncDirs.Add(($parts[0..($i - 1)] -join '/'))
        }
    }
}
$sortedDirs = $syncDirs | Sort-Object -Property { ($_ -split '/').Count } -Descending
foreach ($d in $sortedDirs) {
    if ($protected -contains (Get-TopSegment $d)) { continue }
    $dir = Join-Path $root ($d -replace '/', '\')
    if (Test-Path -LiteralPath $dir) {
        $childCount = @(Get-ChildItem -LiteralPath $dir -Force).Count
        if ($childCount -eq 0) {
            if ($DryRun) {
                Write-Host "[DryRun] RMDIR $d"
            } else {
                Remove-Item -LiteralPath $dir -Force
            }
        }
    }
}

# --- 3. Write the new manifest ---
if ($DryRun) {
    Write-Host "[DryRun] Would write manifest listing $($current.Count) file(s)."
} else {
    $manifest = [ordered]@{
        files = $current
        count = $current.Count
    }
    ($manifest | ConvertTo-Json -Depth 4) | Set-Content -LiteralPath $manifestPath -Encoding UTF8
}

Write-Host ("Sync {0}: {1} copied, {2} removed, {3} file(s) in manifest." -f `
    ($(if ($DryRun) { 'preview' } else { 'complete' })), $copied, $deleted, $current.Count)

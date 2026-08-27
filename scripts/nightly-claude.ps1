# Winter Arc — nightly Claude Code session launcher (Windows / WSL2)
# Register in Task Scheduler to run at 02:30 every day.
#
# Task Scheduler settings:
#   - Trigger: Daily, 02:30
#   - Action: Start a program
#       Program:   powershell.exe
#       Arguments: -NoProfile -ExecutionPolicy Bypass -File "C:\Users\<you>\winter-arc\scripts\nightly-claude.ps1"
#   - Conditions: Wake computer to run this task (check on)
#                 Start only if the following network connection is available (any)
#   - Settings:  Allow task to be run on demand (check on)

$ErrorActionPreference = 'Stop'

$RepoUnc = 'C:\Users\julien\winter-arc'          # adjust to your path
$WslRepo = '/mnt/c/Users/julien/winter-arc'      # WSL2 view of the same path
$WslDistro = 'Ubuntu-24.04'                      # or your distro name

Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Winter Arc nightly launcher starting"

# Sanity check: repo present
if (-not (Test-Path $RepoUnc)) {
    Write-Error "Repo not found at $RepoUnc"
    exit 1
}

# Sanity check: WSL alive
$wslStatus = wsl -l -v 2>$null
if (-not $wslStatus) {
    Write-Error "WSL not available"
    exit 1
}

# Invoke the bash launcher inside WSL.
# The bash script handles all preflight (dirty tree, API reach) and the Claude session itself.
wsl -d $WslDistro -e bash -lc "cd '$WslRepo' && ./scripts/nightly-claude.sh"

$exit = $LASTEXITCODE
Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Session ended with exit $exit"
exit $exit

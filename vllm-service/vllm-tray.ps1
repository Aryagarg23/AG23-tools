# vllm-tray.ps1
# Sits in the Windows system tray, monitors vLLM service status, and provides control options.

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# 1. Prevent duplicate instances of this tray app from running
$currentPid = $PID
$existingTray = Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe'" | Where-Object { $_.CommandLine -like "*vllm-tray.ps1*" -and $_.ProcessId -ne $currentPid }
if ($existingTray) {
    exit
}

$scriptDir = $PSScriptRoot
$manageScript = "$scriptDir\manage-vllm.ps1"
$configPath = "$scriptDir\config.json"
$envConfigPath = "$scriptDir\env-config.json"

# Load env config to get distro name
if (-not (Test-Path $envConfigPath)) {
    exit
}
$envConfig = Get-Content $envConfigPath | ConvertFrom-Json
$distro = $envConfig.wsl_distro
$firewallRuleName = $envConfig.firewall_rule_name

# Helper to create status icon dynamically in memory
function Get-StatusIcon ($colorName) {
    $bitmap = New-Object System.Drawing.Bitmap 16, 16
    $g = [System.Drawing.Graphics]::FromImage($bitmap)
    $g.Clear([System.Drawing.Color]::Transparent)
    
    $color = [System.Drawing.Color]::FromName($colorName)
    $brush = New-Object System.Drawing.SolidBrush($color)
    $g.FillEllipse($brush, 1, 1, 14, 14)
    
    # Draw border
    $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(50, 50, 50), 1)
    $g.DrawEllipse($pen, 1, 1, 13, 13)
    
    $iconHandle = $bitmap.GetHicon()
    return [System.Drawing.Icon]::FromHandle($iconHandle)
}

$iconRed = Get-StatusIcon "Red"       # Stopped
$iconGreen = Get-StatusIcon "LimeGreen"  # Running
$iconOrange = Get-StatusIcon "Orange"   # Loading / Transitioning

# Create Tray Icon
$ni = New-Object System.Windows.Forms.NotifyIcon
$ni.Icon = $iconRed
$ni.Text = "vLLM Serving Service (Checking...)"
$ni.Visible = $true

# Menu Items
$menu = New-Object System.Windows.Forms.ContextMenuStrip

$itemStatus = $menu.Items.Add("Status & Logs")
$itemStart = $menu.Items.Add("Start Service")
$itemStop = $menu.Items.Add("Stop Service")
$itemRestart = $menu.Items.Add("Restart Service")
$menu.Items.Add("-") | Out-Null
$itemConfig = $menu.Items.Add("Edit Model Config (config.json)")
$itemEnvConfig = $menu.Items.Add("Edit Env Config (env-config.json)")
$menu.Items.Add("-") | Out-Null
$itemExit = $menu.Items.Add("Exit Tray App")

$ni.ContextMenuStrip = $menu

# Script-scoped UI element references to enable auto-refresh from background timer
$script:activeStatusForm = $null
$script:lblStatus = $null
$script:lblGpu = $null
$script:lblEndpoint = $null
$script:textBox = $null

# Function to query and refresh metrics in the active window
function Refresh-Dashboard {
    if (-not $script:activeStatusForm -or $script:activeStatusForm.IsDisposed) {
        return
    }
    
    # Check active status
    $isActive = wsl -d $distro -u root systemctl is-active vllm 2>$null
    if ($isActive -eq "active") {
        # Check VRAM
        $gpuInfo = wsl -d $distro -u root nvidia-smi --query-gpu=name,memory.used,memory.total,utilization.gpu --format=csv,noheader 2>$null
        if ($gpuInfo) {
            $parts = $gpuInfo.Split(",")
            $gpuName = $parts[0].Trim()
            $used = $parts[1].Trim()
            $total = $parts[2].Trim()
            $load = $parts[3].Trim()
            
            $script:lblGpu.Text = "$gpuName | VRAM: $used / $total | Load: $load"
            
            $usedVal = [int]($used -replace '\D')
            if ($usedVal -gt 10000) {
                $script:lblStatus.Text = "ONLINE / SERVING"
                $script:lblStatus.ForeColor = [System.Drawing.Color]::LimeGreen
            } else {
                $script:lblStatus.Text = "LOADING MODEL..."
                $script:lblStatus.ForeColor = [System.Drawing.Color]::Orange
            }
        } else {
            $script:lblStatus.Text = "ACTIVE (NO GPU INFO)"
            $script:lblStatus.ForeColor = [System.Drawing.Color]::LimeGreen
            $script:lblGpu.Text = "Unable to query GPU statistics."
        }
    } else {
        $script:lblStatus.Text = "OFFLINE"
        $script:lblStatus.ForeColor = [System.Drawing.Color]::Crimson
        $script:lblGpu.Text = "N/A"
    }
    
    # Load local IPs
    $ips = @()
    $adapters = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" }
    foreach ($a in $adapters) {
        $ips += "http://$($a.IPAddress):8000"
    }
    $script:lblEndpoint.Text = $ips -join "  |  "
    
    # Load journalctl logs
    $logs = wsl -d $distro -u root journalctl -u vllm -n 40 --no-pager 2>$null
    
    # Only update log console text if the user isn't selecting/highlighting text (allows selecting/copying without text resetting)
    if ($script:textBox -and $script:textBox.SelectedText.Length -eq 0) {
        $script:textBox.Text = $logs -replace "`n", "`r`n"
        $script:textBox.SelectionStart = $script:textBox.Text.Length
        $script:textBox.ScrollToCaret()
    }
}

# Status Window Form
function Show-StatusForm {
    # Singleton Check: If already open, focus it instead of spawning a new window
    if ($script:activeStatusForm -and -not $script:activeStatusForm.IsDisposed) {
        $script:activeStatusForm.Activate()
        return
    }
    
    $form = New-Object System.Windows.Forms.Form
    $script:activeStatusForm = $form
    $form.Text = "vLLM Dashboard"
    $form.Size = New-Object System.Drawing.Size(720, 640)
    $form.StartPosition = "CenterScreen"
    $form.FormBorderStyle = "FixedDialog"
    $form.MaximizeBox = $false
    $form.BackColor = [System.Drawing.Color]::FromArgb(28, 28, 28)
    $form.ForeColor = [System.Drawing.Color]::FromArgb(220, 220, 220)
    
    # Title Header
    $titleLabel = New-Object System.Windows.Forms.Label
    $titleLabel.Text = "vLLM SYSTEM STATUS"
    $titleLabel.Font = New-Object System.Drawing.Font("Segoe UI", 14, [System.Drawing.FontStyle]::Bold)
    $titleLabel.Size = New-Object System.Drawing.Size(300, 30)
    $titleLabel.Location = New-Object System.Drawing.Point(15, 15)
    $titleLabel.ForeColor = [System.Drawing.Color]::White
    
    # Dashboard Group Box
    $groupStats = New-Object System.Windows.Forms.GroupBox
    $groupStats.Text = " System Metrics "
    $groupStats.Font = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Bold)
    $groupStats.Size = New-Object System.Drawing.Size(675, 120)
    $groupStats.Location = New-Object System.Drawing.Point(15, 50)
    $groupStats.ForeColor = [System.Drawing.Color]::FromArgb(150, 150, 150)
    
    # Status Label (Copyable)
    $lblStatusTitle = New-Object System.Windows.Forms.Label
    $lblStatusTitle.Text = "Service State:"
    $lblStatusTitle.Location = New-Object System.Drawing.Point(15, 25)
    $lblStatusTitle.Size = New-Object System.Drawing.Size(90, 20)
    $lblStatusTitle.ForeColor = [System.Drawing.Color]::FromArgb(180, 180, 180)
    
    $script:lblStatus = New-Object System.Windows.Forms.TextBox
    $script:lblStatus.ReadOnly = $true
    $script:lblStatus.BorderStyle = [System.Windows.Forms.BorderStyle]::None
    $script:lblStatus.BackColor = [System.Drawing.Color]::FromArgb(28, 28, 28)
    $script:lblStatus.TabStop = $false
    $script:lblStatus.Text = "Checking..."
    $script:lblStatus.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
    $script:lblStatus.Location = New-Object System.Drawing.Point(110, 23)
    $script:lblStatus.Size = New-Object System.Drawing.Size(180, 20)
    
    # GPU / VRAM Label (Copyable)
    $lblGpuTitle = New-Object System.Windows.Forms.Label
    $lblGpuTitle.Text = "GPU / VRAM:"
    $lblGpuTitle.Location = New-Object System.Drawing.Point(15, 55)
    $lblGpuTitle.Size = New-Object System.Drawing.Size(90, 20)
    $lblGpuTitle.ForeColor = [System.Drawing.Color]::FromArgb(180, 180, 180)
    
    $script:lblGpu = New-Object System.Windows.Forms.TextBox
    $script:lblGpu.ReadOnly = $true
    $script:lblGpu.BorderStyle = [System.Windows.Forms.BorderStyle]::None
    $script:lblGpu.BackColor = [System.Drawing.Color]::FromArgb(28, 28, 28)
    $script:lblGpu.TabStop = $false
    $script:lblGpu.Text = "Querying..."
    $script:lblGpu.Font = New-Object System.Drawing.Font("Segoe UI", 9)
    $script:lblGpu.Location = New-Object System.Drawing.Point(110, 55)
    $script:lblGpu.Size = New-Object System.Drawing.Size(550, 20)
    $script:lblGpu.ForeColor = [System.Drawing.Color]::White
    
    # Endpoint Label (Copyable)
    $lblEndpointTitle = New-Object System.Windows.Forms.Label
    $lblEndpointTitle.Text = "Endpoint (LAN):"
    $lblEndpointTitle.Location = New-Object System.Drawing.Point(15, 85)
    $lblEndpointTitle.Size = New-Object System.Drawing.Size(95, 20)
    $lblEndpointTitle.ForeColor = [System.Drawing.Color]::FromArgb(180, 180, 180)
    
    $script:lblEndpoint = New-Object System.Windows.Forms.TextBox
    $script:lblEndpoint.ReadOnly = $true
    $script:lblEndpoint.BorderStyle = [System.Windows.Forms.BorderStyle]::None
    $script:lblEndpoint.BackColor = [System.Drawing.Color]::FromArgb(28, 28, 28)
    $script:lblEndpoint.TabStop = $false
    $script:lblEndpoint.Text = "Querying..."
    $script:lblEndpoint.Font = New-Object System.Drawing.Font("Segoe UI", 9)
    $script:lblEndpoint.Location = New-Object System.Drawing.Point(110, 85)
    $script:lblEndpoint.Size = New-Object System.Drawing.Size(550, 20)
    $script:lblEndpoint.ForeColor = [System.Drawing.Color]::DodgerBlue
    
    $groupStats.Controls.Add($lblStatusTitle)
    $groupStats.Controls.Add($script:lblStatus)
    $groupStats.Controls.Add($lblGpuTitle)
    $groupStats.Controls.Add($script:lblGpu)
    $groupStats.Controls.Add($lblEndpointTitle)
    $groupStats.Controls.Add($script:lblEndpoint)

    # Logs Console Header
    $lblLogs = New-Object System.Windows.Forms.Label
    $lblLogs.Text = "SYSTEMD LOG CONSOLE"
    $lblLogs.Font = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Bold)
    $lblLogs.Location = New-Object System.Drawing.Point(15, 185)
    $lblLogs.Size = New-Object System.Drawing.Size(200, 20)
    $lblLogs.ForeColor = [System.Drawing.Color]::FromArgb(150, 150, 150)
    
    # Text Console (Copyable log block)
    $script:textBox = New-Object System.Windows.Forms.TextBox
    $script:textBox.Multiline = $true
    $script:textBox.ScrollBars = "Vertical"
    $script:textBox.ReadOnly = $true
    $script:textBox.Font = New-Object System.Drawing.Font("Consolas", 9)
    $script:textBox.BackColor = [System.Drawing.Color]::FromArgb(18, 18, 18)
    $script:textBox.ForeColor = [System.Drawing.Color]::FromArgb(0, 220, 120)
    $script:textBox.Size = New-Object System.Drawing.Size(675, 345)
    $script:textBox.Location = New-Object System.Drawing.Point(15, 210)
    $script:textBox.BorderStyle = [System.Windows.Forms.BorderStyle]::FixedSingle
    
    # Custom styled flat buttons
    $btnRefresh = New-Object System.Windows.Forms.Button
    $btnRefresh.Text = "Refresh"
    $btnRefresh.Size = New-Object System.Drawing.Size(90, 30)
    $btnRefresh.Location = New-Object System.Drawing.Point(15, 565)
    $btnRefresh.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
    $btnRefresh.FlatAppearance.BorderSize = 1
    $btnRefresh.FlatAppearance.BorderColor = [System.Drawing.Color]::FromArgb(80, 80, 80)
    $btnRefresh.BackColor = [System.Drawing.Color]::FromArgb(45, 45, 45)
    $btnRefresh.ForeColor = [System.Drawing.Color]::White
    $btnRefresh.Add_Click({
        $script:textBox.Text = "Querying latest logs and GPU metrics..."
        Refresh-Dashboard
    })
    
    $btnRestart = New-Object System.Windows.Forms.Button
    $btnRestart.Text = "Restart Service"
    $btnRestart.Size = New-Object System.Drawing.Size(120, 30)
    $btnRestart.Location = New-Object System.Drawing.Point(115, 565)
    $btnRestart.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
    $btnRestart.FlatAppearance.BorderSize = 1
    $btnRestart.FlatAppearance.BorderColor = [System.Drawing.Color]::FromArgb(80, 80, 80)
    $btnRestart.BackColor = [System.Drawing.Color]::FromArgb(45, 45, 45)
    $btnRestart.ForeColor = [System.Drawing.Color]::White
    $btnRestart.Add_Click({
        $script:textBox.Text = "Sending restart command to vLLM background daemon..."
        Start-Process powershell -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$manageScript`" stop" -WindowStyle Hidden -Wait
        Start-Process powershell -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$manageScript`" start" -WindowStyle Hidden
        Start-Sleep -Seconds 2
        Refresh-Dashboard
    })
    
    $btnClose = New-Object System.Windows.Forms.Button
    $btnClose.Text = "Close"
    $btnClose.Size = New-Object System.Drawing.Size(90, 30)
    $btnClose.Location = New-Object System.Drawing.Point(600, 565)
    $btnClose.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
    $btnClose.FlatAppearance.BorderSize = 1
    $btnClose.FlatAppearance.BorderColor = [System.Drawing.Color]::FromArgb(80, 80, 80)
    $btnClose.BackColor = [System.Drawing.Color]::FromArgb(45, 45, 45)
    $btnClose.ForeColor = [System.Drawing.Color]::White
    $btnClose.Add_Click({ $form.Close() })
    
    # Load initial data
    Refresh-Dashboard
    
    # Assemble Controls
    $form.Controls.Add($titleLabel)
    $form.Controls.Add($groupStats)
    $form.Controls.Add($lblLogs)
    $form.Controls.Add($script:textBox)
    $form.Controls.Add($btnRefresh)
    $form.Controls.Add($btnRestart)
    $form.Controls.Add($btnClose)
    
    # Show as modeless (non-blocking window)
    $form.Show()
}

# Add handlers
$itemStatus.Add_Click({ Show-StatusForm })
$itemStart.Add_Click({
    $ni.Icon = $iconOrange
    $ni.Text = "vLLM: Starting..."
    Start-Process powershell -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$manageScript`" start" -WindowStyle Hidden
})
$itemStop.Add_Click({
    $ni.Icon = $iconOrange
    $ni.Text = "vLLM: Stopping..."
    Start-Process powershell -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$manageScript`" stop" -WindowStyle Hidden
})
$itemRestart.Add_Click({
    $ni.Icon = $iconOrange
    $ni.Text = "vLLM: Restarting..."
    Start-Process powershell -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$manageScript`" stop" -WindowStyle Hidden -Wait
    Start-Process powershell -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$manageScript`" start" -WindowStyle Hidden
})
$itemConfig.Add_Click({
    Start-Process notepad.exe $configPath
})
$itemEnvConfig.Add_Click({
    Start-Process notepad.exe $envConfigPath
})
$itemExit.Add_Click({
    $ni.Visible = $false
    $ni.Dispose()
    [System.Windows.Forms.Application]::Exit()
    exit
})

# Double click tray icon opens Status Form
$ni.Add_DoubleClick({ Show-StatusForm })

# Timer to check status in background and auto-update dashboard
$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 5000  # Check status every 5 seconds
$timer.Add_Tick({
    $isActive = wsl -d $distro -u root systemctl is-active vllm 2>$null
    if ($isActive -eq "active") {
        # Check VRAM to see if model is loaded
        $gpuInfo = wsl -d $distro -u root nvidia-smi --query-gpu=memory.used --format=csv,noheader,nounits 2>$null
        if ($gpuInfo) {
            $vramString = $gpuInfo.Trim() -replace '\D'
            if ($vramString -ne "") {
                $vram = [int]$vramString
                if ($vram -gt 10000) {
                    $ni.Icon = $iconGreen
                    $ni.Text = "vLLM Serving Service: ONLINE"
                } else {
                    $ni.Icon = $iconOrange
                    $ni.Text = "vLLM Serving Service: LOADING MODEL"
                }
            } else {
                $ni.Icon = $iconGreen
                $ni.Text = "vLLM Serving Service: ACTIVE"
            }
        } else {
            $ni.Icon = $iconGreen
            $ni.Text = "vLLM Serving Service: ACTIVE"
        }
    } else {
        $ni.Icon = $iconRed
        $ni.Text = "vLLM Serving Service: STOPPED"
    }
    
    # Auto-refresh open dashboard window in real-time
    if ($script:activeStatusForm -and -not $script:activeStatusForm.IsDisposed) {
        Refresh-Dashboard
    }
})

$timer.Start()

# Run application message loop
[System.Windows.Forms.Application]::Run()

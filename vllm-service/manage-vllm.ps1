param(
    [Parameter(Mandatory=$true, Position=0)]
    [ValidateSet("install", "start", "stop", "status", "register-autostart", "test", "uninstall")]
    [string]$Action
)

# Helper to check for Administrator privileges
function Test-IsAdmin {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# Resolve config files
$envConfigPath = "$PSScriptRoot\env-config.json"
if (-not (Test-Path $envConfigPath)) {
    Write-Host "[Error] env-config.json not found." -ForegroundColor Red
    exit 1
}
$envConfig = Get-Content $envConfigPath | ConvertFrom-Json

$configPath = "$PSScriptRoot\config.json"
if (-not (Test-Path $configPath)) {
    Write-Host "[Error] config.json not found." -ForegroundColor Red
    exit 1
}
$config = Get-Content $configPath | ConvertFrom-Json

$distro = $envConfig.wsl_distro
$wslServiceDir = $envConfig.wsl_service_dir
$venvPath = $envConfig.wsl_venv_path
$firewallRuleName = $envConfig.firewall_rule_name
$taskName = $envConfig.scheduled_task_name

# Function to pipe Windows files into WSL natively
function Copy-FileToWsl {
    param (
        [string]$WindowsPath,
        [string]$WslDestPath
    )
    if (Test-Path $WindowsPath) {
        Get-Content $WindowsPath -Raw | wsl -d $distro -u arya bash -c "cat > $WslDestPath"
    }
}

switch ($Action) {
    "install" {
        Write-Host "=========================================" -ForegroundColor Green
        Write-Host "   Installing vLLM Service on WSL 2      " -ForegroundColor Green
        Write-Host "=========================================" -ForegroundColor Green
        
        # 1. Clean up legacy directory if it exists
        Write-Host "[1/6] Cleaning up legacy paths if they exist..." -ForegroundColor Cyan
        wsl -d $distro -u root systemctl stop vllm 2>$null
        wsl -d $distro -u root systemctl disable vllm 2>$null
        wsl -d $distro -u root rm -f /etc/systemd/system/vllm.service 2>$null
        wsl -d $distro -u root systemctl daemon-reload
        wsl -d $distro -u arya rm -rf $wslServiceDir 2>$null
        
        # 2. Update WSL config for Mirrored Networking
        Write-Host "[2/6] Configuring WSL Mirrored Networking..." -ForegroundColor Cyan
        $wslConfigPath = "C:\Users\arya\.wslconfig"
        $restartWsl = $false
        if (Test-Path $wslConfigPath) {
            $content = Get-Content $wslConfigPath -Raw
            if ($content -notmatch "networkingMode\s*=\s*mirrored") {
                if ($content -match "\[wsl2\]") {
                    $content = $content -replace "\[wsl2\]", "[wsl2]`r`nnetworkingMode=mirrored"
                } else {
                    $content += "`r`n[wsl2]`r`nnetworkingMode=mirrored"
                }
                Set-Content $wslConfigPath -Value $content
                $restartWsl = $true
            }
        } else {
            $defaultConfig = "[wsl2]`r`nmemory=32000MB`r`nnetworkingMode=mirrored"
            Set-Content $wslConfigPath -Value $defaultConfig
            $restartWsl = $true
        }
        
        if ($restartWsl) {
            Write-Host "[!] Restarting WSL to apply networking changes..." -ForegroundColor Yellow
            wsl --shutdown
            Start-Sleep -Seconds 3
        }
        
        # Create service folder in WSL
        wsl -d $distro -u arya mkdir -p $wslServiceDir
        wsl -d $distro -u arya mkdir -p "$wslServiceDir/.agents"
        
        # 3. Copy files to native WSL directory for optimal disk performance
        Write-Host "[3/6] Copying configurations and scripts to native WSL partition..." -ForegroundColor Cyan
        Copy-FileToWsl -WindowsPath "$PSScriptRoot\config.json" -WslDestPath "$wslServiceDir/config.json"
        Copy-FileToWsl -WindowsPath "$PSScriptRoot\env-config.json" -WslDestPath "$wslServiceDir/env-config.json"
        Copy-FileToWsl -WindowsPath "$PSScriptRoot\..\.agents\AGENTS.md" -WslDestPath "$wslServiceDir/.agents/AGENTS.md"
        Copy-FileToWsl -WindowsPath "$PSScriptRoot\launch.py" -WslDestPath "$wslServiceDir/launch.py"
        Copy-FileToWsl -WindowsPath "$PSScriptRoot\manage-vllm.sh" -WslDestPath "$wslServiceDir/manage-vllm.sh"
        wsl -d $distro -u arya chmod +x "$wslServiceDir/manage-vllm.sh"
        
        # 4. Create python virtual environment inside WSL and install vLLM
        Write-Host "[4/6] Creating Python virtual environment natively in WSL (ext4)..." -ForegroundColor Cyan
        wsl -d $distro -u arya python3 -m venv $venvPath
        if ($LASTEXITCODE -ne 0) {
            Write-Host "[Error] Failed to create virtual environment inside WSL Ubuntu." -ForegroundColor Red
            exit 1
        }
        
        Write-Host "[5/6] Installing vLLM (uses cache from previous runs)..." -ForegroundColor Cyan
        wsl -d $distro -u arya $venvPath/bin/pip install --upgrade pip
        wsl -d $distro -u arya $venvPath/bin/pip install vllm
        if ($LASTEXITCODE -ne 0) {
            Write-Host "[Error] Failed to install vLLM inside virtual environment." -ForegroundColor Red
            exit 1
        }
        
        # 5. Generate and configure the systemd service unit
        Write-Host "[6/6] Creating WSL systemd service..." -ForegroundColor Cyan
        $serviceContent = @"
[Unit]
Description=vLLM Serving Service
After=network.target

[Service]
Type=simple
User=arya
WorkingDirectory=$wslServiceDir
ExecStart=$venvPath/bin/python $wslServiceDir/launch.py
Restart=always
RestartSec=10
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=multi-user.target
"@
        
        $encodedService = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($serviceContent))
        wsl -d $distro -u root bash -c "echo $encodedService | base64 -d > /etc/systemd/system/vllm.service"
        wsl -d $distro -u root systemctl daemon-reload
        wsl -d $distro -u root systemctl enable vllm
        
        # Configure Windows Firewall
        try {
            $rule = Get-NetFirewallRule -Name $firewallRuleName -ErrorAction SilentlyContinue
            if (-not $rule) {
                New-NetFirewallRule -Name $firewallRuleName -DisplayName "vLLM Service Port 8000" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow -ErrorAction Stop | Out-Null
                Write-Host "[+] Windows Firewall rule created." -ForegroundColor Green
            } else {
                Write-Host "[*] Windows Firewall rule already exists." -ForegroundColor Gray
            }
        } catch {
            Write-Host "[WARNING] Failed to automatically create Windows Firewall rule (requires Administrator privileges)." -ForegroundColor Yellow
            Write-Host "Please run the following command manually in an Administrator PowerShell window:" -ForegroundColor Yellow
            Write-Host "New-NetFirewallRule -Name `"$firewallRuleName`" -DisplayName `"vLLM Service Port 8000`" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow" -ForegroundColor White
        }
        
        Write-Host ""
        Write-Host "[+] Setup completed successfully!" -ForegroundColor Green
        Write-Host "You can now start the service using: .\manage-vllm.ps1 start" -ForegroundColor Yellow
        Write-Host "Or register it for startup using: .\manage-vllm.ps1 register-autostart" -ForegroundColor Yellow
    }
    
    "start" {
        # Sync latest configs from Windows to WSL before starting
        Write-Host "[*] Syncing latest configs to WSL..." -ForegroundColor Cyan
        wsl -d $distro -u arya mkdir -p "$wslServiceDir/.agents" 2>$null
        Copy-FileToWsl -WindowsPath "$PSScriptRoot\config.json" -WslDestPath "$wslServiceDir/config.json"
        Copy-FileToWsl -WindowsPath "$PSScriptRoot\env-config.json" -WslDestPath "$wslServiceDir/env-config.json"
        Copy-FileToWsl -WindowsPath "$PSScriptRoot\..\.agents\AGENTS.md" -WslDestPath "$wslServiceDir/.agents/AGENTS.md"
        
        Write-Host "[*] Starting vLLM Service..." -ForegroundColor Cyan
        wsl -d $distro -u root systemctl start vllm
        Start-Sleep -Seconds 2
        Write-Host "[+] Service started." -ForegroundColor Green
        Write-Host "[*] Use '.\manage-vllm.ps1 status' to check logs." -ForegroundColor Yellow
    }
    
    "stop" {
        Write-Host "[*] Stopping vLLM Service..." -ForegroundColor Cyan
        wsl -d $distro -u root systemctl stop vllm
        Write-Host "[+] Service stopped." -ForegroundColor Green
    }
    
    "status" {
        Write-Host "=========================================" -ForegroundColor Green
        Write-Host "            Service Status               " -ForegroundColor Green
        Write-Host "=========================================" -ForegroundColor Green
        wsl -d $distro -u root systemctl status vllm
        
        Write-Host ""
        Write-Host "=========================================" -ForegroundColor Green
        Write-Host "             Recent Logs                 " -ForegroundColor Green
        Write-Host "=========================================" -ForegroundColor Green
        wsl -d $distro -u root journalctl -u vllm -n 30 --no-pager
    }
    
    "register-autostart" {
        Write-Host "[*] Registering vLLM Autostart Task..." -ForegroundColor Cyan
        try {
            $action = New-ScheduledTaskAction -Execute "wsl.exe" -Argument "-d $distro -u root systemctl start vllm"
            $trigger = New-ScheduledTaskTrigger -AtLogon -User "$env:USERNAME"
            $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
            $principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive
            
            $task = Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force -ErrorAction Stop
            Write-Host "[+] Scheduled task registered successfully!" -ForegroundColor Green
            Write-Host "The service will start automatically when user '$env:USERNAME' logs into Windows." -ForegroundColor Yellow
        } catch {
            Write-Host "[WARNING] Failed to automatically register startup task (may require Administrator privileges)." -ForegroundColor Yellow
            Write-Host "Please run this command again in an Administrator PowerShell window." -ForegroundColor Yellow
        }
    }

    "test" {
        Write-Host "=========================================" -ForegroundColor Green
        Write-Host "         vLLM Full System Test           " -ForegroundColor Green
        Write-Host "=========================================" -ForegroundColor Green

        # 1. Check WSL Service Status
        Write-Host "[1/4] Checking WSL service status..." -ForegroundColor Cyan
        $serviceStatus = wsl -d $distro -u root systemctl is-active vllm 2>$null
        if ($serviceStatus -eq "active") {
            Write-Host "[+] WSL Systemd Service: ACTIVE" -ForegroundColor Green
        } else {
            Write-Host "[X] WSL Systemd Service: NOT ACTIVE (Status: $serviceStatus)" -ForegroundColor Red
            Write-Host "Please start the service first using: .\manage-vllm.ps1 start" -ForegroundColor Yellow
            exit 1
        }

        # 2. Get Port and Model Info
        $model = $config.model
        $port = $config.port
        Write-Host "Model Configured: $model" -ForegroundColor White
        Write-Host "Port Configured:  $port" -ForegroundColor White

        # 3. Get IP Addresses for LAN Access
        Write-Host "[2/4] Resolving host network adapters and LAN IPs..." -ForegroundColor Cyan
        # Get active IPv4 addresses (excluding loopback and virtual adapters)
        $ips = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" -and $_.InterfaceAlias -notmatch "vEthernet" } | Select-Object -ExpandProperty IPAddress
        
        Write-Host "Local host IP: localhost:$port" -ForegroundColor Gray
        foreach ($ip in $ips) {
            Write-Host "LAN Access IP: http://$ip`:$port" -ForegroundColor Green
        }

        # 4. Check Windows Firewall
        Write-Host "[3/4] Checking Windows Defender Firewall rule..." -ForegroundColor Cyan
        $rule = Get-NetFirewallRule -Name $firewallRuleName -ErrorAction SilentlyContinue
        if ($rule) {
            if ($rule.Enabled -eq 'True') {
                Write-Host "[+] Firewall Rule '$firewallRuleName' is ENABLED" -ForegroundColor Green
            } else {
                Write-Host "[WARNING] Firewall Rule exists but is DISABLED" -ForegroundColor Yellow
            }
        } else {
            Write-Host "[WARNING] Firewall Rule '$firewallRuleName' was not found. LAN access may be blocked." -ForegroundColor Yellow
        }

        # 5. Check GPU/VRAM Usage
        $gpuInfo = wsl -d $distro -u root nvidia-smi --query-gpu=name,memory.used,memory.total,utilization.gpu --format=csv,noheader,nounits 2>$null
        if ($gpuInfo) {
            $parts = $gpuInfo.Split(",")
            Write-Host "GPU: $($parts[0].Trim()) | VRAM: $($parts[1].Trim())MB / $($parts[2].Trim())MB | GPU Load: $($parts[3].Trim())%" -ForegroundColor Gray
        }

        # 6. Test connection and measure response latency
        Write-Host "[4/4] Sending test API request to vLLM..." -ForegroundColor Cyan
        $testUrl = "http://localhost:$port/v1/models"
        
        $startTime = Get-Date
        try {
            $response = Invoke-RestMethod -Uri $testUrl -Method Get -TimeoutSec 10 -ErrorAction Stop
            $elapsedTime = ((Get-Date) - $startTime).TotalMilliseconds
            Write-Host "[+] Connection SUCCESS! Latency: $(([math]::Round($elapsedTime, 2)))ms" -ForegroundColor Green
            Write-Host "Available Models:" -ForegroundColor White
            $response.data | ForEach-Object { Write-Host " - $($_.id)" -ForegroundColor Green }
        } catch {
            Write-Host "[X] Connection FAILED to $testUrl" -ForegroundColor Red
            Write-Host "Details: $_" -ForegroundColor Yellow
            Write-Host "The model might still be downloading/loading. Check logs using: .\manage-vllm.ps1 status" -ForegroundColor Yellow
        }
    }
    
    "uninstall" {
        Write-Host "=========================================" -ForegroundColor Red
        Write-Host "       Uninstalling vLLM Service         " -ForegroundColor Red
        Write-Host "=========================================" -ForegroundColor Red
        
        # Stop service
        Write-Host "[1/4] Stopping and disabling WSL service..." -ForegroundColor Cyan
        wsl -d $distro -u root systemctl stop vllm 2>$null
        wsl -d $distro -u root systemctl disable vllm 2>$null
        wsl -d $distro -u root rm -f /etc/systemd/system/vllm.service 2>$null
        wsl -d $distro -u root systemctl daemon-reload
        
        # Remove firewall rule
        Write-Host "[2/4] Removing Windows Firewall rule..." -ForegroundColor Cyan
        try {
            Remove-NetFirewallRule -Name $firewallRuleName -ErrorAction Stop
            Write-Host "[+] Firewall rule removed." -ForegroundColor Green
        } catch {
            Write-Host "[WARNING] Failed to automatically remove Windows Firewall rule." -ForegroundColor Yellow
            Write-Host "Please run manually in Admin PowerShell: Remove-NetFirewallRule -Name `"$firewallRuleName`"" -ForegroundColor White
        }
        
        # Remove scheduled task
        Write-Host "[3/4] Removing Scheduled Task..." -ForegroundColor Cyan
        try {
            Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction Stop
            Write-Host "[+] Scheduled task removed." -ForegroundColor Green
        } catch {
            Write-Host "[WARNING] Failed to automatically remove Scheduled Task." -ForegroundColor Yellow
            Write-Host "Please run manually in Admin PowerShell: Unregister-ScheduledTask -TaskName `"$taskName`" -Confirm:`$false" -ForegroundColor White
        }
        
        # Remove virtual environment and folder
        Write-Host "[4/4] Removing service folder from WSL..." -ForegroundColor Cyan
        wsl -d $distro -u arya rm -rf $wslServiceDir
        
        Write-Host ""
        Write-Host "[+] Uninstallation completed successfully!" -ForegroundColor Green
    }
}

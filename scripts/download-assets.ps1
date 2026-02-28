$ErrorActionPreference = "Stop"

$base = "https://raw.githubusercontent.com/pablodelucca/pixel-agents/main/webview-ui/public"
$dest = "c:\Users\Moon\Desktop\Kracked_Skills_Agent\frontend\public\assets"

# Create directories
New-Item -ItemType Directory -Force -Path "$dest\characters" | Out-Null

# Download character sprites
for ($i = 0; $i -le 5; $i++) {
    Write-Host "Downloading char_$i.png..."
    Invoke-WebRequest "$base/assets/characters/char_$i.png" -OutFile "$dest\characters\char_$i.png"
}

# Download walls tileset
Write-Host "Downloading walls.png..."
Invoke-WebRequest "$base/assets/walls.png" -OutFile "$dest\walls.png"

# Download combined character sheet
Write-Host "Downloading characters.png..."
Invoke-WebRequest "$base/characters.png" -OutFile "$dest\characters.png"

# Download default layout
Write-Host "Downloading default-layout.json..."
Invoke-WebRequest "$base/assets/default-layout.json" -OutFile "$dest\default-layout.json"

Write-Host "ALL DOWNLOADS COMPLETE!"

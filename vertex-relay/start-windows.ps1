$ErrorActionPreference = 'Stop'
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw 'Node.js 22 이상을 설치한 뒤 다시 실행하세요.'
}
Add-Type -AssemblyName System.Windows.Forms
$dialog = New-Object System.Windows.Forms.OpenFileDialog
$dialog.Filter = 'Google 서비스 계정 키 (*.json)|*.json'
$dialog.Title = 'Vertex AI 서비스 계정 JSON 키 선택'
if ($dialog.ShowDialog() -ne [System.Windows.Forms.DialogResult]::OK) { exit }
try {
    & node (Join-Path $PSScriptRoot 'server.cjs') --key $dialog.FileName
} finally {
    $dialog.Dispose()
}

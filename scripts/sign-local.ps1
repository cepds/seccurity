param(
  [string]$CertificatePath = $env:SIGN_CERT_PATH,
  [string]$CertificatePassword = $env:SIGN_CERT_PASSWORD,
  [string]$TimestampUrl = $env:SIGN_TIMESTAMP_URL,
  [string]$DigestAlgorithm = "SHA256",
  [string]$ReleaseDir = (Join-Path $PSScriptRoot "..\\release")
)

$ErrorActionPreference = "Stop"

function Write-Notice([string]$Message) {
  Write-Host "[sign:local] $Message"
}

function Resolve-SignTool {
  $command = Get-Command signtool.exe -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Source
  }

  $kitsRoot = "C:\\Program Files (x86)\\Windows Kits\\10\\bin"
  if (-not (Test-Path $kitsRoot)) {
    return $null
  }

  $candidate = Get-ChildItem $kitsRoot -Recurse -Filter signtool.exe -File |
    Sort-Object FullName -Descending |
    Select-Object -First 1

  if ($candidate) {
    return $candidate.FullName
  }

  return $null
}

if (-not (Test-Path $ReleaseDir)) {
  Write-Notice "Pasta de release nao encontrada em $ReleaseDir. Execute npm run dist:win primeiro."
  exit 0
}

$signToolPath = Resolve-SignTool
if (-not $signToolPath) {
  Write-Notice "signtool.exe nao encontrado. Instale Windows SDK / SignTool para assinar localmente."
  exit 0
}

if (-not $CertificatePath) {
  Write-Notice "SIGN_CERT_PATH nao definido. Build segue sem assinatura."
  exit 0
}

if (-not (Test-Path $CertificatePath)) {
  Write-Notice "Certificado nao encontrado em $CertificatePath. Build segue sem assinatura."
  exit 0
}

$targets = Get-ChildItem $ReleaseDir -File -Filter *.exe | Sort-Object Name
if (-not $targets) {
  Write-Notice "Nenhum executavel encontrado para assinar em $ReleaseDir."
  exit 0
}

foreach ($target in $targets) {
  $arguments = @(
    "sign",
    "/fd", $DigestAlgorithm,
    "/f", $CertificatePath
  )

  if ($CertificatePassword) {
    $arguments += @("/p", $CertificatePassword)
  }

  if ($TimestampUrl) {
    $arguments += @("/tr", $TimestampUrl, "/td", $DigestAlgorithm)
  }

  $arguments += $target.FullName

  Write-Notice "Assinando $($target.Name)"
  & $signToolPath @arguments

  if ($LASTEXITCODE -ne 0) {
    throw "Falha ao assinar $($target.FullName) com exit code $LASTEXITCODE."
  }
}

Write-Notice "Assinatura local concluida."

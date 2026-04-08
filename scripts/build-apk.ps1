param(
  [ValidateSet("Debug", "Release")]
  [string]$BuildType = "Debug"
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$appDir = Split-Path -Parent $scriptDir
$androidDir = Join-Path $appDir "android"

if (-not $env:JAVA_HOME) {
  $androidStudioJbr = "C:\Program Files\Android\Android Studio\jbr"
  if (Test-Path $androidStudioJbr) {
    $env:JAVA_HOME = $androidStudioJbr
  }
}

if (-not $env:JAVA_HOME) {
  throw "JAVA_HOME nao esta configurado e nenhum JDK do Android Studio foi encontrado."
}

$javaBin = Join-Path $env:JAVA_HOME "bin"
if (-not (Test-Path (Join-Path $javaBin "java.exe"))) {
  throw "JAVA_HOME aponta para '$env:JAVA_HOME', mas java.exe nao foi encontrado em '$javaBin'."
}

$env:Path = "$javaBin;$env:Path"

Push-Location $androidDir
try {
  & .\gradlew.bat "assemble$BuildType"
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }
} finally {
  Pop-Location
}

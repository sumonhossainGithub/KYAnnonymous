<#
.SYNOPSIS
    Builds and signs the KYAnonymous Android APK.
.DESCRIPTION
    Uses the local Android SDK and Java JDK tools to compile, package, zipalign,
    and sign the production KYAnonymous Android APK.
#>

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$srcDir    = Join-Path $scriptDir "src"
$buildDir  = Join-Path $scriptDir "build"
$outputApk = Join-Path $scriptDir "KYAnonymous.apk"

# Locate JDK
$jdk = $env:JAVA_HOME
if (-not $jdk -or -not (Test-Path "$jdk\bin\javac.exe")) {
    $fallbackJdk = "C:\Users\sumon\.p2\pool\plugins\org.eclipse.justj.openjdk.hotspot.jre.full.win32.x86_64_21.0.7.v20250502-0916\jre"
    if (Test-Path "$fallbackJdk\bin\javac.exe") {
        $jdk = $fallbackJdk
    } else {
        throw "Could not locate a valid Java Development Kit (javac.exe). Please set JAVA_HOME."
    }
}
$env:JAVA_HOME = $jdk
$env:Path = "$jdk\bin;$env:Path"

$javac   = Join-Path $jdk "bin\javac.exe"
$jar     = Join-Path $jdk "bin\jar.exe"
$keytool = Join-Path $jdk "bin\keytool.exe"

# Locate Android SDK
$sdk = $env:ANDROID_HOME
if (-not $sdk -or -not (Test-Path $sdk)) {
    $sdk = "C:\Users\sumon\AppData\Local\Android\Sdk"
}

$buildToolsDir = Join-Path $sdk "build-tools\36.0.0"
if (-not (Test-Path $buildToolsDir)) {
    $buildToolsDir = (Get-ChildItem (Join-Path $sdk "build-tools") | Sort-Object Name -Descending | Select-Object -First 1).FullName
}

$platformsDir = Join-Path $sdk "platforms\android-35"
if (-not (Test-Path $platformsDir)) {
    $platformsDir = (Get-ChildItem (Join-Path $sdk "platforms") | Sort-Object Name -Descending | Select-Object -First 1).FullName
}
$androidJar = Join-Path $platformsDir "android.jar"

$aapt2     = Join-Path $buildToolsDir "aapt2.exe"
$d8        = Join-Path $buildToolsDir "d8.bat"
$zipalign  = Join-Path $buildToolsDir "zipalign.exe"
$apksigner = Join-Path $buildToolsDir "apksigner.bat"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Building KYAnonymous Android APK" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "JDK:         $jdk"
Write-Host "Build-tools: $buildToolsDir"
Write-Host "Platform:    $androidJar"

# Reset build directory
if (Test-Path $buildDir) { Remove-Item -Recurse -Force $buildDir }
New-Item -ItemType Directory -Force -Path "$buildDir\compiled", "$buildDir\gen", "$buildDir\obj", "$buildDir\dex" | Out-Null

Write-Host "[1/6] Compiling resources with aapt2..." -ForegroundColor Yellow
& $aapt2 compile --dir "$srcDir\res" -o "$buildDir\compiled\res.zip"

Write-Host "[2/6] Linking resources & generating R.java..." -ForegroundColor Yellow
& $aapt2 link "$buildDir\compiled\res.zip" -I $androidJar --manifest "$srcDir\AndroidManifest.xml" --java "$buildDir\gen" -o "$buildDir\unaligned.apk"

Write-Host "[3/6] Compiling Java code with javac..." -ForegroundColor Yellow
$javaFiles = Get-ChildItem -Recurse "$srcDir\java", "$buildDir\gen" -Filter "*.java" | Select-Object -ExpandProperty FullName
& $javac -cp $androidJar -d "$buildDir\obj" -source 8 -target 8 -Xlint:-options $javaFiles

Write-Host "[4/6] Converting bytecode to Dalvik dex with d8..." -ForegroundColor Yellow
$classFiles = Get-ChildItem -Recurse "$buildDir\obj" -Filter "*.class" | Select-Object -ExpandProperty FullName
& $d8 --output "$buildDir\dex" --lib $androidJar $classFiles

Write-Host "[5/6] Packaging classes.dex and zipaligning..." -ForegroundColor Yellow
Push-Location "$buildDir\dex"
& $jar -uf "$buildDir\unaligned.apk" "classes.dex"
Pop-Location
& $zipalign -v -p 4 "$buildDir\unaligned.apk" "$buildDir\aligned.apk" | Out-Null

Write-Host "[6/6] Signing APK with apksigner..." -ForegroundColor Yellow
$keystore = Join-Path $scriptDir "build_tools\kyanonymous.keystore"
if (-not (Test-Path $keystore)) {
    & $keytool -genkey -v -keystore $keystore -alias kyanonymous -keyalg RSA -keysize 2048 -validity 10000 -storepass "kyanonymous" -keypass "kyanonymous" -dname "CN=KYAnonymous, OU=Mobile, O=HiddenCurrency, L=Unknown, ST=Unknown, C=US" 2>$null
}
& $apksigner sign --ks $keystore --ks-pass pass:kyanonymous --out $outputApk "$buildDir\aligned.apk"

# Verify
& $apksigner verify --verbose $outputApk

$file = Get-Item $outputApk
$hash = Get-FileHash -Path $outputApk -Algorithm SHA256

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "  BUILD SUCCESSFUL!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host "APK Location: $outputApk" -ForegroundColor Cyan
Write-Host "File Size:    $([Math]::Round($file.Length / 1KB, 2)) KB" -ForegroundColor Cyan
Write-Host "SHA256:       $($hash.Hash)" -ForegroundColor Cyan

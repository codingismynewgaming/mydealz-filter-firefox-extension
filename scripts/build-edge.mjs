#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const appFilesDir = path.join(rootDir, "app-files");
const edgeDir = path.join(rootDir, "edge");
const buildsDir = path.join(rootDir, "builds");
const unpackedDir = path.join(buildsDir, "edge-unpacked");

const appManifestPath = path.join(appFilesDir, "manifest.json");
const edgeManifestPath = path.join(edgeDir, "manifest.json");
const edgeBackgroundSwPath = path.join(edgeDir, "src", "background-sw.js");

function readJson(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${label} not found at ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function copyDirFiltered(src, dest) {
  if (!fs.existsSync(src)) {
    throw new Error(`Source folder does not exist: ${src}`);
  }
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "META-INF" || entry.name === ".amo-upload-uuid" || entry.name === ".git") {
      continue;
    }
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirFiltered(srcPath, destPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function assertNoForbiddenFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.name === "META-INF" || entry.name === ".amo-upload-uuid") {
      throw new Error(`Forbidden file or folder found in build output: ${fullPath}`);
    }
    if (entry.isDirectory()) {
      assertNoForbiddenFiles(fullPath);
    }
  }
}

function createZipArchive(sourceDirectory, destinationZip) {
  if (fs.existsSync(destinationZip)) {
    fs.rmSync(destinationZip, { force: true });
  }

  // 1. Try Python zipfile (creates guaranteed POSIX slashes)
  const pythonScript = `
import os, sys, zipfile

src_dir = os.path.abspath(sys.argv[1])
zip_path = os.path.abspath(sys.argv[2])

with zipfile.ZipFile(zip_path, 'w', compression=zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, files in os.walk(src_dir):
        for file in files:
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, src_dir).replace('\\\\', '/')
            zf.write(full_path, arcname=rel_path)
`;

  const pyResult = spawnSync("python", ["-c", pythonScript, sourceDirectory, destinationZip], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (pyResult.status === 0 && fs.existsSync(destinationZip)) {
    return "python-zipfile";
  }

  // 2. Fallback: .NET System.IO.Compression via PowerShell (explicit POSIX forward slashes)
  const psScript = `
param($src, $dst)
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$srcFull = [System.IO.Path]::GetFullPath($src)
$dstFull = [System.IO.Path]::GetFullPath($dst)
if (Test-Path -LiteralPath $dstFull) { Remove-Item -LiteralPath $dstFull -Force }
$zip = [System.IO.Compression.ZipFile]::Open($dstFull, [System.IO.Compression.ZipArchiveMode]::Create)
try {
    Get-ChildItem -LiteralPath $srcFull -Recurse -File | ForEach-Object {
        $rel = $_.FullName.Substring($srcFull.Length).TrimStart('\\', '/').Replace('\\', '/')
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $rel, [System.IO.Compression.CompressionLevel]::Optimal)
    }
} finally {
    $zip.Dispose()
}
`;

  const psResult = spawnSync(
    "powershell",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", psScript, "-src", sourceDirectory, "-dst", destinationZip],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }
  );

  if (psResult.status !== 0 || !fs.existsSync(destinationZip)) {
    const errorDetails = [
      `Python output: ${pyResult.stderr || pyResult.stdout || "none"}`,
      `PowerShell output: ${psResult.stderr || psResult.stdout || "none"}`,
    ].join("\n");
    throw new Error(`Failed to create ZIP package with Python or .NET:\n${errorDetails}`);
  }

  return "dotnet-ziparchive";
}

function verifyZipEntries(zipPath) {
  const verifyScript = `
import sys, zipfile

zip_path = sys.argv[1]
with zipfile.ZipFile(zip_path, 'r') as zf:
    names = zf.namelist()
    for name in names:
        if '\\\\' in name:
            raise SystemExit(f"Non-POSIX backslash found in zip entry: {name}")
        if 'META-INF' in name or '.amo-upload-uuid' in name:
            raise SystemExit(f"Forbidden entry found in zip archive: {name}")
    print(f"VERIFIED:{len(names)}")
`;

  const checkResult = spawnSync("python", ["-c", verifyScript, zipPath], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (checkResult.status === 0 && checkResult.stdout.includes("VERIFIED:")) {
    const count = checkResult.stdout.trim().split("VERIFIED:")[1];
    return Number.parseInt(count, 10);
  }

  // Fallback verification via .NET
  const psVerify = `
param($dst)
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead($dst)
try {
    foreach ($entry in $zip.Entries) {
        if ($entry.FullName.Contains('\\')) {
            throw "Non-POSIX backslash found: $($entry.FullName)"
        }
        if ($entry.FullName.Contains('META-INF') -or $entry.FullName.Contains('.amo-upload-uuid')) {
            throw "Forbidden entry found: $($entry.FullName)"
        }
    }
    Write-Output "VERIFIED:$($zip.Entries.Count)"
} finally {
    $zip.Dispose()
}
`;

  const psCheck = spawnSync(
    "powershell",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", psVerify, "-dst", zipPath],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }
  );

  if (psCheck.status !== 0 || !psCheck.stdout.includes("VERIFIED:")) {
    throw new Error(`Zip verification failed: ${psCheck.stderr || psCheck.stdout}`);
  }

  const count = psCheck.stdout.trim().split("VERIFIED:")[1];
  return Number.parseInt(count, 10);
}

function build() {
  console.log("==> Building Microsoft Edge MV3 Extension...");

  // 1. Read manifests & pre-validate
  const appManifest = readJson(appManifestPath, "app-files/manifest.json");
  const edgeManifest = readJson(edgeManifestPath, "edge/manifest.json");

  if (!fs.existsSync(edgeBackgroundSwPath)) {
    throw new Error(`Edge service worker entry point missing at ${edgeBackgroundSwPath}`);
  }

  // Synchronize version if needed
  if (edgeManifest.version !== appManifest.version) {
    console.log(
      `[build-edge] Synchronizing edge/manifest.json version (${edgeManifest.version} -> ${appManifest.version})`
    );
    edgeManifest.version = appManifest.version;
    fs.writeFileSync(edgeManifestPath, JSON.stringify(edgeManifest, null, 2) + "\n", "utf8");
  }

  // Validate edge manifest requirements
  if (!edgeManifest.background?.service_worker) {
    throw new Error("edge/manifest.json is missing 'background.service_worker'");
  }
  if (edgeManifest.background?.scripts !== undefined) {
    throw new Error("edge/manifest.json must not have 'background.scripts' (Edge MV3 requires service worker)");
  }
  if (edgeManifest.browser_specific_settings !== undefined) {
    throw new Error("edge/manifest.json must not have 'browser_specific_settings'");
  }

  // 2. Prepare builds/edge-unpacked directory
  fs.mkdirSync(buildsDir, { recursive: true });
  if (fs.existsSync(unpackedDir)) {
    fs.rmSync(unpackedDir, { recursive: true, force: true });
  }
  fs.mkdirSync(unpackedDir, { recursive: true });

  // 3. Copy shared assets from app-files (filtering out META-INF and .amo-upload-uuid)
  copyDirFiltered(path.join(appFilesDir, "src"), path.join(unpackedDir, "src"));
  copyDirFiltered(path.join(appFilesDir, "_locales"), path.join(unpackedDir, "_locales"));
  copyDirFiltered(path.join(appFilesDir, "icons"), path.join(unpackedDir, "icons"));

  // 4. Overwrite manifest.json with edge/manifest.json and copy edge/src/background-sw.js
  fs.copyFileSync(edgeManifestPath, path.join(unpackedDir, "manifest.json"));
  fs.copyFileSync(edgeBackgroundSwPath, path.join(unpackedDir, "src", "background-sw.js"));

  // 5. Post-copy assertions on unpacked directory
  assertNoForbiddenFiles(unpackedDir);

  const unpackedManifest = readJson(path.join(unpackedDir, "manifest.json"), "builds/edge-unpacked/manifest.json");
  if (unpackedManifest.version !== appManifest.version) {
    throw new Error(
      `Unpacked manifest version mismatch (${unpackedManifest.version} != ${appManifest.version})`
    );
  }
  if (!unpackedManifest.background?.service_worker) {
    throw new Error("Unpacked manifest missing 'background.service_worker'");
  }
  if (unpackedManifest.background?.scripts !== undefined) {
    throw new Error("Unpacked manifest contains forbidden 'background.scripts'");
  }
  if (unpackedManifest.browser_specific_settings !== undefined) {
    throw new Error("Unpacked manifest contains forbidden 'browser_specific_settings'");
  }

  // Verify service worker file exists
  const swResolved = path.join(unpackedDir, unpackedManifest.background.service_worker);
  if (!fs.existsSync(swResolved)) {
    throw new Error(`Service worker file missing at: ${swResolved}`);
  }

  // Verify all icon paths exist
  const iconPaths = [
    ...Object.values(unpackedManifest.icons || {}),
    ...Object.values(unpackedManifest.action?.default_icon || {}),
  ];
  for (const iconPath of iconPaths) {
    const fullIconPath = path.join(unpackedDir, iconPath);
    if (!fs.existsSync(fullIconPath)) {
      throw new Error(`Referenced icon does not exist: ${fullIconPath}`);
    }
  }

  console.log(`[build-edge] Verified unpacked extension at: ${unpackedDir}`);

  // 6. Pack into ZIP with POSIX forward slashes
  const targetZipName = `mydealz-de-filter-edge-v${unpackedManifest.version}.zip`;
  const targetZipPath = path.join(buildsDir, targetZipName);

  const packMethod = createZipArchive(unpackedDir, targetZipPath);
  const entryCount = verifyZipEntries(targetZipPath);

  console.log(`[build-edge] Package created successfully: ${targetZipPath}`);
  console.log(`[build-edge] Method: ${packMethod}, Verified entries: ${entryCount} (all POSIX slashes)`);
}

build();

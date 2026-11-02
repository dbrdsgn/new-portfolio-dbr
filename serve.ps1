# Локальный сервер для просмотра сайта без установки программ.
# Запуск: правой кнопкой по файлу → «Выполнить с помощью PowerShell»
# или в терминале: powershell -ExecutionPolicy Bypass -File serve.ps1
# Остановить: закрыть окно или Ctrl+C.

param([int]$Port = 8080)

$root = $PSScriptRoot
$types = @{
  ".html" = "text/html; charset=utf-8"; ".css" = "text/css; charset=utf-8"
  ".js" = "text/javascript; charset=utf-8"; ".json" = "application/json; charset=utf-8"
  ".md" = "text/plain; charset=utf-8"; ".txt" = "text/plain; charset=utf-8"
  ".svg" = "image/svg+xml"; ".png" = "image/png"; ".jpg" = "image/jpeg"; ".jpeg" = "image/jpeg"
  ".gif" = "image/gif"; ".webp" = "image/webp"; ".avif" = "image/avif"; ".ico" = "image/x-icon"
  ".mp4" = "video/mp4"; ".webm" = "video/webm"; ".woff2" = "font/woff2"; ".pdf" = "application/pdf"
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Сайт открыт: http://localhost:$Port/  (Ctrl+C — остановить)"

try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $res = $ctx.Response
    try {
      $rel = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart("/")
      $path = [IO.Path]::GetFullPath((Join-Path $root $rel))
      if (-not $path.StartsWith($root)) { $res.StatusCode = 403; continue }
      if (Test-Path $path -PathType Container) { $path = Join-Path $path "index.html" }
      if (Test-Path $path -PathType Leaf) {
        $ext = [IO.Path]::GetExtension($path).ToLower()
        $res.ContentType = if ($types[$ext]) { $types[$ext] } else { "application/octet-stream" }
        $res.Headers.Add("Cache-Control", "no-store")
        $bytes = [IO.File]::ReadAllBytes($path)
        $res.ContentLength64 = $bytes.Length
        $res.OutputStream.Write($bytes, 0, $bytes.Length)
      } else {
        $res.StatusCode = 404
        $msg = [Text.Encoding]::UTF8.GetBytes("404 — страница ещё не сделана: /$rel")
        $res.ContentType = "text/plain; charset=utf-8"
        $res.OutputStream.Write($msg, 0, $msg.Length)
      }
      Write-Host "$($res.StatusCode) /$rel"
    } catch {
      $res.StatusCode = 500
    } finally {
      $res.OutputStream.Close()
    }
  }
} finally {
  $listener.Stop()
}

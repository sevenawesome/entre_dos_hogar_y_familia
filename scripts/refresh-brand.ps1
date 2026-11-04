Add-Type -AssemblyName System.Drawing
function Draw-Mark($graphics, $notification) {
  if (!$notification) {
    $rect = New-Object Drawing.RectangleF(2, 2, 96, 96)
    $gradient = New-Object Drawing.Drawing2D.LinearGradientBrush($rect, [Drawing.ColorTranslator]::FromHtml('#FF7864'), [Drawing.ColorTranslator]::FromHtml('#C12968'), [single]45)
    $graphics.FillEllipse($gradient, 2, 2, 96, 96)
    $gradient.Dispose()
  }
  $heart = New-Object Drawing.Drawing2D.GraphicsPath
  $heart.AddBezier(50, 73, 37, 64, 22, 54, 22, 41)
  $heart.AddBezier(22, 41, 22, 25, 43, 25, 50, 38)
  $heart.AddBezier(50, 38, 57, 25, 78, 25, 78, 41)
  $heart.AddBezier(78, 41, 78, 54, 63, 64, 50, 73)
  $heart.CloseFigure()
  $pen = New-Object Drawing.Pen([Drawing.Color]::White, [single]4.5)
  $pen.LineJoin = [Drawing.Drawing2D.LineJoin]::Round
  if ($notification) { $graphics.FillPath([Drawing.Brushes]::White, $heart) } else { $graphics.DrawPath($pen, $heart) }
  if (!$notification) {
    $infinity = New-Object Drawing.Drawing2D.GraphicsPath
    $infinity.AddBezier(35, 50, 40, 43, 46, 43, 50, 50)
    $infinity.AddBezier(50, 50, 54, 57, 60, 57, 65, 50)
    $infinity.AddBezier(65, 50, 60, 43, 54, 43, 50, 50)
    $infinity.AddBezier(50, 50, 46, 57, 40, 57, 35, 50)
    $goldPen = New-Object Drawing.Pen([Drawing.ColorTranslator]::FromHtml('#FFE4A5'), [single]3)
    $graphics.DrawPath($goldPen, $infinity)
    $goldPen.Dispose(); $infinity.Dispose()
  }
  $pen.Dispose(); $heart.Dispose()
}
function Make-Mark($path, $size, $transparent, $notification, $adaptive) {
  $bitmap = New-Object Drawing.Bitmap($size, $size)
  $graphics = [Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.Clear($(if ($transparent) { [Drawing.Color]::Transparent } else { [Drawing.ColorTranslator]::FromHtml('#FFF9F6') }))
  $graphics.ScaleTransform($size / 100.0, $size / 100.0)
  if ($adaptive) { $graphics.TranslateTransform(18, 18); $graphics.ScaleTransform(.64, .64) }
  Draw-Mark $graphics $notification
  $bitmap.Save((Join-Path (Get-Location) $path), [Drawing.Imaging.ImageFormat]::Png)
  $graphics.Dispose(); $bitmap.Dispose()
}
Make-Mark 'assets/icon.png' 1024 $false $false $false
Make-Mark 'assets/adaptive-icon.png' 1024 $true $false $true
Make-Mark 'assets/favicon.png' 64 $false $false $false
Make-Mark 'assets/notification-icon.png' 96 $true $true $false
$bitmap = New-Object Drawing.Bitmap(1440, 440)
$graphics = [Drawing.Graphics]::FromImage($bitmap)
$graphics.Clear([Drawing.Color]::Transparent)
$graphics.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.TextRenderingHint = [Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$graphics.TranslateTransform(35, 35); $graphics.ScaleTransform(3.7, 3.7)
Draw-Mark $graphics $false
$graphics.ResetTransform()
$titleFont = New-Object Drawing.Font('Georgia', [single]130, [Drawing.FontStyle]::Regular, [Drawing.GraphicsUnit]::Pixel)
$byFont = New-Object Drawing.Font('Segoe UI', [single]35, [Drawing.FontStyle]::Regular, [Drawing.GraphicsUnit]::Pixel)
$ink = New-Object Drawing.SolidBrush([Drawing.ColorTranslator]::FromHtml('#343047'))
$rose = New-Object Drawing.SolidBrush([Drawing.ColorTranslator]::FromHtml('#BF385B'))
$graphics.DrawString('ENTRE DOS', $titleFont, $ink, 440, 90)
$graphics.DrawString('By Departamento de Hogar y Familia', $byFont, $rose, 456, 266)
foreach ($path in @('assets/logo.png', 'assets/splash-icon.png')) { $bitmap.Save((Join-Path (Get-Location) $path), [Drawing.Imaging.ImageFormat]::Png) }
$titleFont.Dispose(); $byFont.Dispose(); $ink.Dispose(); $rose.Dispose(); $graphics.Dispose(); $bitmap.Dispose()

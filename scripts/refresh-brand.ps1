# Build deterministic platform sizes from the approved supplied/generated brand masters.
# No external downloads, credentials or native-project edits.
Add-Type -AssemblyName System.Drawing
$ErrorActionPreference = 'Stop'
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @"
using System.Drawing;
public static class BrandMaskPixels {
  public static void White(Bitmap bitmap) {
    for (int y=0;y<bitmap.Height;y++) for(int x=0;x<bitmap.Width;x++) {
      Color pixel=bitmap.GetPixel(x,y);
      if(pixel.A>0) bitmap.SetPixel(x,y,Color.FromArgb(pixel.A,255,255,255));
    }
  }
}
"@
$assetRoot = Join-Path $PSScriptRoot '../assets'
function Save-Image($source, $destination, $width, $height, $transparent = $false) {
  $original = [Drawing.Image]::FromFile((Join-Path $assetRoot $source))
  $format = if ($transparent) { [Drawing.Imaging.PixelFormat]::Format32bppArgb } else { [Drawing.Imaging.PixelFormat]::Format24bppRgb }
  $bitmap = [Drawing.Bitmap]::new($width, $height, $format)
  $g = [Drawing.Graphics]::FromImage($bitmap)
  $g.Clear($(if ($transparent) { [Drawing.Color]::Transparent } else { [Drawing.ColorTranslator]::FromHtml('#FBF7EE') }))
  $g.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $ratio = [Math]::Min($width / $original.Width, $height / $original.Height)
  $w = [int]($original.Width * $ratio); $h = [int]($original.Height * $ratio)
  $g.DrawImage($original, [int](($width-$w)/2), [int](($height-$h)/2), $w, $h)
  if ($destination.EndsWith('.jpg')) {
    $codec = [Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object MimeType -eq 'image/jpeg'
    $parameters = [Drawing.Imaging.EncoderParameters]::new(1)
    $parameters.Param[0] = [Drawing.Imaging.EncoderParameter]::new([Drawing.Imaging.Encoder]::Quality, [long]88)
    $bitmap.Save((Join-Path $assetRoot $destination), $codec, $parameters)
    $parameters.Dispose()
  } else { $bitmap.Save((Join-Path $assetRoot $destination), [Drawing.Imaging.ImageFormat]::Png) }
  $g.Dispose(); $bitmap.Dispose(); $original.Dispose()
}
Save-Image 'brand/icon-square-source.png' 'icon.png' 1024 1024
Save-Image 'brand/icon-square-source.png' 'favicon.png' 64 64
Save-Image 'brand/logo-source.png' 'logo.png' 1200 600 $true
Save-Image 'brand/splash-art-source.png' 'brand/splash-art.jpg' 1024 1536
# Android adaptive layers: the supplied wordmark remains inside the central safe zone.
$bitmap=[Drawing.Bitmap]::new(1024,1024); $g=[Drawing.Graphics]::FromImage($bitmap)
$g.Clear([Drawing.Color]::Transparent);$g.InterpolationMode=[Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$logo=[Drawing.Image]::FromFile((Join-Path $assetRoot 'logo.png'))
$g.DrawImage($logo,192,330,640,320)
foreach($name in @('adaptive-icon.png','android-icon-foreground.png')){$bitmap.Save((Join-Path $assetRoot $name),[Drawing.Imaging.ImageFormat]::Png)}
$g.Clear([Drawing.Color]::Transparent); $g.DrawImage($logo,92,290,840,420)
$bitmap.Save((Join-Path $assetRoot 'splash-icon.png'),[Drawing.Imaging.ImageFormat]::Png)
$g.Clear([Drawing.ColorTranslator]::FromHtml('#FBF7EE'));$g.SmoothingMode=[Drawing.Drawing2D.SmoothingMode]::AntiAlias
$wave=[Drawing.Drawing2D.GraphicsPath]::new();$wave.AddBezier(0,850,310,1030,670,670,1024,760);$wave.AddLine(1024,760,1024,1024);$wave.AddLine(1024,1024,0,1024);$wave.CloseFigure()
$gold=[Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml('#C79527'));$g.FillPath($gold,$wave)
$g.TranslateTransform(0,35);$navy=[Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml('#06264A'));$g.FillPath($navy,$wave);$g.ResetTransform()
$bitmap.Save((Join-Path $assetRoot 'android-icon-background.png'),[Drawing.Imaging.ImageFormat]::Png)
$gold.Dispose();$navy.Dispose();$wave.Dispose();$logo.Dispose();$g.Dispose();$bitmap.Dispose()
# A legible monochrome version of the open heart; Android status-bar icons must be white + alpha.
foreach($item in @(@('notification-icon.png',96),@('android-icon-monochrome.png',1024))) {
  $size=[int]$item[1]; $b=[Drawing.Bitmap]::new($size,$size);$g=[Drawing.Graphics]::FromImage($b);$g.Clear([Drawing.Color]::Transparent)
  $g.SmoothingMode=[Drawing.Drawing2D.SmoothingMode]::AntiAlias;$g.ScaleTransform($size/100.0,$size/100.0)
  if($size -gt 100){$g.TranslateTransform(18,18);$g.ScaleTransform(.64,.64)}
  $p=[Drawing.Drawing2D.GraphicsPath]::new()
  $p.AddBezier(24,69,4,36,13,10,33,20);$p.AddBezier(33,20,43,26,48,42,50,48)
  $p.AddBezier(50,48,56,16,76,2,85,15);$p.AddBezier(85,15,105,43,52,81,14,92)
  $p.AddBezier(14,92,45,74,86,42,78,23);$p.AddBezier(78,23,73,12,58,35,51,58)
  $p.AddBezier(51,58,47,44,34,25,25,29);$p.AddBezier(25,29,17,33,18,53,24,69);$p.CloseFigure()
  $g.FillPath([Drawing.Brushes]::White,$p);[BrandMaskPixels]::White($b);$b.Save((Join-Path $assetRoot $item[0]),[Drawing.Imaging.ImageFormat]::Png)
  $p.Dispose();$g.Dispose();$b.Dispose()
}
Write-Output 'Brand assets built: app/adaptive/notification icons, logo, native splash mark and optimized artwork.'

param(
  [string]$Url = "",
  [string]$Destination = "C:\Users\yghellis\Downloads\generated-video.mp4"
)

if ([string]::IsNullOrWhiteSpace($Url)) {
  Write-Error "Pass -Url <raw-github-url-or-hosted-file-url>."
  exit 1
}

Write-Host "Downloading to $Destination ..."
Invoke-WebRequest $Url -OutFile $Destination
Write-Host "Done: $Destination"

# Package Extension for Distribution

Quick guide to package the extension for GitHub release.

---

## Method 1: Windows (Easiest)

1. Open File Explorer
2. Navigate to your project folder
3. Right-click on the **`extension`** folder
4. Choose **"Send to"** → **"Compressed (zipped) folder"**
5. Rename the ZIP file to: `tazkiyat-extension-v1.0.0.zip`
6. Done! Upload this to GitHub Releases

---

## Method 2: Command Line (Any OS)

### Windows (PowerShell)
```powershell
Compress-Archive -Path extension -DestinationPath tazkiyat-extension-v1.0.0.zip -Force
```

### Mac/Linux
```bash
cd /path/to/project
zip -r tazkiyat-extension-v1.0.0.zip extension/
```

---

## What's Included

The ZIP will contain:
```
extension/
├── manifest.json
├── background.js
├── popup/
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
└── icons/
    ├── icon16.svg
    ├── icon48.svg
    └── icon128.svg
```

---

## Next Steps

After creating the ZIP:
1. Follow instructions in [docs/GITHUB_RELEASE.md](docs/GITHUB_RELEASE.md)
2. Create a GitHub release
3. Upload the ZIP file
4. Share with friends!

---

## File Size

Expected ZIP size: ~50-100 KB

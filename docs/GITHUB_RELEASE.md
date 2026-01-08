# How to Create a GitHub Release

Follow these steps to create a release for the Chrome extension.

---

## Step 1: Prepare the Extension Package

1. Make sure all extension files are up to date
2. The files to include in the ZIP:
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

3. Create a ZIP file:
   - Select the **`extension`** folder
   - Right-click → Send to → Compressed (zipped) folder
   - Rename it to: `tazkiyat-extension-v1.0.0.zip`

---

## Step 2: Go to GitHub Releases

1. Open your browser and go to: https://github.com/omar173ahmed/tazkiyat
2. Click on the **"Releases"** link (right side of the page)
3. Click **"Create a new release"** or **"Draft a new release"**

---

## Step 3: Fill in Release Information

### Tag Version
- Click "Choose a tag"
- Type: `extension-v1.0.0`
- Click "Create new tag: extension-v1.0.0"

### Release Title
```
تزكيات Chrome Extension v1.0.0
```

### Release Description

Copy and paste this:

```markdown
# تزكيات Chrome Extension v1.0.0

Share web recommendations with your friends through a simple Chrome extension.
شارك توصيات الويب مع أصدقائك من خلال إضافة كروم بسيطة.

## 📥 Download | التحميل

Download the ZIP file below and follow the installation guide.
حمّل الملف المضغوط أدناه واتبع دليل التثبيت.

## 📖 Installation Guides | أدلة التثبيت

- [English Installation Guide](https://github.com/omar173ahmed/tazkiyat/blob/main/docs/INSTALLATION_EN.md)
- [دليل التثبيت بالعربية](https://github.com/omar173ahmed/tazkiyat/blob/main/docs/INSTALLATION_AR.md)

## ✨ Features | المميزات

- ✅ One-click recommendation sharing | مشاركة بنقرة واحدة
- ✅ Auto-fetch page titles | جلب العناوين تلقائياً  
- ✅ Add tags and comments | إضافة وسوم وتعليقات
- ✅ Dark theme UI | واجهة داكنة
- ✅ Pre-configured for Railway | مُعد مسبقاً لـ Railway

## 🔧 Configuration | الإعداد

The extension is pre-configured to connect to:
الإضافة مُعدة مسبقاً للاتصال بـ:
```
https://tazkiyat-production.up.railway.app
```

## 📋 Requirements | المتطلبات

- Google Chrome 88+ or Microsoft Edge
- Valid user account
- Internet connection

## 🔄 Changelog | سجل التغييرات

### Version 1.0.0 (Initial Release)
- Initial release of Chrome extension
- Session-based authentication
- Share recommendations with one click
- Auto-fetch page titles
- Tag support
- Dark theme UI
- Bilingual documentation (English + Arabic)

## 🆘 Support | الدعم

If you encounter any issues:
إذا واجهت أي مشاكل:

1. Check the [Troubleshooting section](https://github.com/omar173ahmed/tazkiyat/blob/main/docs/INSTALLATION_EN.md#troubleshooting) in the installation guide
2. Contact the administrator

---

**Enjoy sharing recommendations! | استمتع بمشاركة التوصيات!** 🎉
```

---

## Step 4: Upload the ZIP File

1. Scroll down to **"Attach binaries"** section
2. Click or drag the `tazkiyat-extension-v1.0.0.zip` file
3. Wait for upload to complete (you'll see a green checkmark)

---

## Step 5: Publish Release

1. Make sure everything looks correct
2. **Uncheck** "Set as a pre-release" (unless this is a beta)
3. **Check** "Set as the latest release"
4. Click **"Publish release"**

---

## Step 6: Get the Download Link

After publishing:
1. The release will appear on the Releases page
2. Copy the download link for the ZIP file
3. It will be: `https://github.com/omar173ahmed/tazkiyat/releases/download/extension-v1.0.0/tazkiyat-extension-v1.0.0.zip`

---

## Step 7: Share with Friends

Use this message template:

### WhatsApp/Telegram Message:

```
🎉 تزكيات Chrome Extension is Ready!

Download: https://github.com/omar173ahmed/tazkiyat/releases/latest

📖 Installation:
English: https://github.com/omar173ahmed/tazkiyat/blob/main/docs/INSTALLATION_EN.md
Arabic: https://github.com/omar173ahmed/tazkiyat/blob/main/docs/INSTALLATION_AR.md

Takes 2 minutes to install! Let me know if you need help.

---

🎉 إضافة تزكيات جاهزة!

التحميل: https://github.com/omar173ahmed/tazkiyat/releases/latest

📖 دليل التثبيت:
English: https://github.com/omar173ahmed/tazkiyat/blob/main/docs/INSTALLATION_EN.md
عربي: https://github.com/omar173ahmed/tazkiyat/blob/main/docs/INSTALLATION_AR.md

يستغرق التثبيت دقيقتين فقط! أخبرني إذا احتجت مساعدة.
```

---

## Done! ✅

Your Chrome extension is now available for download via GitHub Releases.

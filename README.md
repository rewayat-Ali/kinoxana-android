# كىنوخانا - Android App

كىنوخانا Android ئەسلىمىسى - Cordova + GitHub Actions

## ئۇچۇر

- **بېلەت نامى**: كىنوخانا
- **پەكېت نامى**: `com.yultuz.kinoxana`
- **نەشرى**: 1.0.0

## GitHub Actions ئارقىلىق قاچىلاش

### قەدەم 1: GitHub غا يوللاش

```bash
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/USERNAME/REPO_NAME.git
git push -u origin main
```

### قەدەم 2: GitHub Actions ئىشلىتىش

كود push قىلغاندىن كېيىن، GitHub Actions ئۆزى ئىشلەپ APK قاچىلايدۇ.

1. GitHub دىكى ساھىپىڭىزغا كىرىڭ
2. **Actions** تەۋەلىكىنى بېسىڭ
3. **Build Android APK** ناملىق work flow نى تېپىڭ
4. ئەڭ ئاخىرقى build نى بېسىڭ
5. ئاستىغا سۈرگەندە **Artifacts** ئۈستىدە
6. `kinoxana-debug-apk` ياكى `kinoxana-release-apk` نى چۈشۈرۈڭ

### قەدەم 3: ئىمزالىغان Release APK قاچىلاش (ئىختىيارىي)

ئەگەر ئىمزالىغان release APK قاچىلماقچى بولسىڭىز، GitHub Secrets قا ئۆزۈڭىزنىڭ ئىمزا ھۆججىتىنى قوشۇڭ:

1. Repo → Settings → Secrets and variables → Actions
2. تۆۋەندىكى Secrets لەرنى قوشۇڭ:

   | نام | چۈشەندۈرۈش |
   |-----|------------|
   | `KEYSTORE_FILE` | keystore ھۆججىتى (base64 شەكىلدە) |
   | `KEYSTORE_PASSWORD` | keystore پارولى |
   | `KEY_ALIAS` | alias نامى |
   | `KEY_PASSWORD` | key پارولى |

3. Keystore نى base64 غا ئايلاندۇرۇش:
   ```bash
   base64 -i your.keystore -o keystore_base64.txt
   ```

## ئۆزىڭىز ئوقۇسىز قاچىلاش

ئەگەر ئۆزىڭىز ئوقۇسىز قاچىلماقچى بولسىڭىز (Node.js + Java + Android SDK بولۇشى كېرەك):

```bash
# ئورنىتىش
npm install -g cordova
npm install

# Android پلاتفورمىسىنى قوشۇش
cordova platform add android

# Debug APK قاچىلاش
cordova build android

# Release APK قاچىلاش
cordova build android --release
```

## ھۆججەت قۇرۇلمىسى

```
kinoxana-android/
├── .github/
│   └── workflows/
│       └── build.yml          # GitHub Actions قاچىلاش سۈرىتى
├── www/                        # H5 مەنبە كودى (بۇ يەرگە كودىڭىزنى قويۇڭ)
│   ├── index.html
│   ├── css/
│   ├── js/
│   └── fonts/
├── config.xml                  # Cordova سەپلىمىسى
├── package.json                # Node.js باغلىمىسى
├── .gitignore
└── README.md
```

## ئۆزگەرتىش

### بېلەت نامىنى ئۆزگەرتىش

`config.xml` دىكى `<name>` تەگىنى ئۆزگەرتىڭ.

### پەكېت نامىنى ئۆزگەرتىش

`config.xml` دىكى `id` ئۇسۇلىنى ئۆزگەرتىڭ:
```xml
<widget id="com.yultuz.kinoxana" ...>
```

### نەشرى نومۇرىنى ئۆزگەرتىش

`config.xml` دىكى `version` ئۇسۇلىنى ئۆزگەرتىڭ.

## ئالاقە

- **API ئادرېسى**: `https://xk.uyanqi710.top/api/v1`
- **WeChat AppID**: `wxa1f3d2b5d9f1f4e4`

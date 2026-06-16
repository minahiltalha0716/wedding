# Wedding Website - Private Repo

Private repository for wedding website with password-protected private photos.

## Architecture Overview

This is a **private-public split** setup:

```
┌──────────────────────┐         ┌──────────────────────┐
│ PRIVATE REPO         │         │ PUBLIC REPO          │
│ (wedding-private)    │         │ (wedding)            │
├──────────────────────┤         ├──────────────────────┤
│ • index.html         │         │ • index.html         │
│ • assets/            │ Deploy  │ • assets/            │
│ • images/            │ ──────> │ (NO images/)         │
│ • server/            │         │                      │
└──────────────────────┘         └──────────────────────┘
         │                                │
         │ (GitHub API)                   │ (HTTP request)
         │                                │
         │              ┌─────────────────┘
         │              │
         └─────────> Password-Protected
                    Image Server
                    (Render/Railway)
                         │
                         │ (Serves images to public site)
                         │ (Validates password)
                         ▼
```

## Deployment Flow

1. **Commit to private repo** → trigger GitHub Actions
2. **Action excludes** `images/` folder and encrypts private images
3. **Action deploys** website code + encrypted image blobs to public repo's `gh-pages` branch
4. **Public website** shows a password prompt
5. **User enters password** → browser decrypts images locally in the visitor's browser
6. **Images displayed** on public website without exposing original files

## Quick Start

### 1. Add Private Images

```bash
# Images stored here (NOT deployed to public)
mkdir -p images
# Add your image files here (couple.png, photo1.jpg, etc.)
git add images/
git commit -m "Add private wedding photos"
git push
```

### 2. Set Up GitHub Secrets

In private repo: **Settings → Secrets and variables → Actions → New repository secret**

- **Name:** `API_TOKEN_GITHUB`
  - **Value:** Your GitHub personal access token with `repo` scope
  - [Create token here](https://github.com/settings/tokens?type=beta)

- **Name:** `PAGES_REPO`
  - **Value:** Your public repo as `owner/repo` (e.g., `minahiltalha0716/wedding`)

- **Name:** `IMAGE_PASSWORD`
  - **Value:** The password used to encrypt/decrypt your private images.

### 3. No separate server required

This repository now uses a GitHub Actions-based encryption pipeline instead of a separate backend server. The public website will decrypt images locally in the browser using the password you enter.

## File Structure

```
wedding-private/
├── .github/
│   └── workflows/
│       └── deploy.yml          # CI/CD workflow (encrypts private images)
├── assets/
│   ├── css/style.css           # Styling with color palette
│   └── js/main.js              # Frontend with auth + image loading
├── images/                      # PRIVATE - NOT deployed directly
│   ├── couple.png
│   └── photo1.jpg              # Add your private images here
├── scripts/
│   └── encrypt-images.js       # Encryption script run in Actions
├── index.html                  # Main page with auth modal
├── package.json                # Frontend dependencies
└── README.md                   # This file
```

## Local Development

### Test Static Site

```bash
# Start static server (Python)
python3 -m http.server 8000

# Or with npm
npx http-server -c-1 . -p 8000

# Open http://localhost:8000
```

### Test Image Server Locally

```bash
cd server
npm install
cp .env.example .env
# Edit .env with your values
npm start

# In another terminal, test:
curl -H "X-Image-Password: your_password" \
  http://localhost:3000/image/couple.png --output couple.png
```

## Secrets Setup

### Private Repo Secrets

**Required for CI/CD deployment:**
- `API_TOKEN_GITHUB`: GitHub token with `repo` scope
- `PAGES_REPO`: Target public repo (`owner/repo`)

### Image Server Environment Variables

**Required for server deployment (set in Render/Railway):**
- `GITHUB_TOKEN`: GitHub token with `repo` scope
- `IMAGE_PASSWORD`: Secure password for viewing photos
- `REPO_OWNER`: GitHub username
- `REPO_NAME`: This repo name (`wedding-private`)
- `IMAGES_BRANCH`: Branch with images (`main`)
- `PORT`: Server port (optional, defaults to `3000`)

## How Password Protection Works

1. **Public site** loads → shows password modal
2. **User enters password** → stored in browser localStorage
3. **Browser requests image** from server with password header
4. **Server validates** password against `IMAGE_PASSWORD` env var
5. **If valid:** server fetches image from private repo via GitHub API and returns it
6. **If invalid:** server returns 401 Unauthorized

**Security notes:**
- Password stored in browser (localStorage) - suitable for semi-public sites
- For higher security, use HTTPS only (Render/Railway provide this)
- Don't use highly sensitive passwords
- All communication is encrypted over HTTPS in production

## Workflow Details

The GitHub Actions workflow in `.github/workflows/deploy.yml`:

1. Checks out the private repo
2. Builds (if `package.json` has build script)
3. **Excludes:** `images/`, `server/`, `.github/`, `node_modules/`
4. **Includes:** `index.html`, `assets/`, `package.json`, `README.md`
5. Deploys to public repo's `gh-pages` branch

To modify what gets deployed, edit the "Prepare deployment" step in the workflow file.

## Troubleshooting

### Images not showing on public site
- Verify server is deployed and running
- Check server URL is correct in browser console
- Verify GitHub token has repo read access
- Check IMAGE_PASSWORD matches what you entered

### Deployment workflow failing
- Check `API_TOKEN_GITHUB` secret is set correctly
- Verify `PAGES_REPO` is in `owner/repo` format
- Check you have write permissions to the public repo

### Server returning 401
- Wrong password entered
- Image server environment variables not set correctly

## Customization

### Color Palette

Update in `assets/css/style.css`:
```css
--accent-red: #7b1414;
--accent-gold: #caa43a;
--accent-black: #0b0b0b;
--off-white: #f8f3ef;
```

### Add Images to Gallery

Edit `index.html` and add to the gallery:
```html
<div class="gallery-item">
  <img id="photo-1" alt="Wedding photo 1">
  <script>loadImage('photo1.jpg', 'photo-1');</script>
</div>
```

### Change Password

Update `IMAGE_PASSWORD` in server environment variables on Render/Railway.

## Support

- See `server/README.md` for detailed server setup guide
- See `.github/workflows/deploy.yml` for CI/CD configuration
- GitHub Actions logs: Public repo → Actions tab

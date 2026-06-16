Deployment setup

Secrets required in the private repository settings -> Actions -> Secrets:

- `DEPLOY_TOKEN`: a personal access token with `repo` scope that can push to the target repository.
- `PAGES_REPO`: the target public repository in the form `owner/repo` where Pages will be published.

Notes:
- The workflow builds (if applicable) and deploys to the `gh-pages` branch of `PAGES_REPO`.
- To update the build output folder, edit `folder: ${{ env.BUILD_DIR }}` in `.github/workflows/deploy.yml` or modify the build detection logic.
- The `gh-pages` branch will be created automatically if it doesn't exist.

Permissions note:
- Your personal access token (`API_TOKEN_GITHUB` secret) must have `repo` scope with push access to the target repository.
- Being a collaborator with "Write" access to the destination repo is required.
- The token should belong to an account with sufficient permissions to push to the destination repo.

Add a hero image
--
Place your hero image at `images/couple.png` in this repo. The site CSS references `/images/couple.png` for the hero background. If you don't add an image, the hero will show the gold background color.

Run locally
--
You can test the site locally using a simple static server. Examples:

```bash
# with Python 3 (from repo root)
python3 -m http.server 8000

# or with http-server (npm)
npx http-server -c-1 . -p 8000
```

Then open http://localhost:8000 in your browser.


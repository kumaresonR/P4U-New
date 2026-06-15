# GitHub repos & Actions — runbook for P4U apps

Use this checklist when publishing **any** new app repo (e.g. `p4u-admin-web`, `p4u-new-user-web`, services) under **PlanextConsole** (or another org).

---

## 1. Create the repository on GitHub

1. GitHub → **New repository**.
2. Owner: **PlanextConsole** (or target org).
3. Name: e.g. `p4u-admin-web`, `p4u-new-user-web`.
4. **Visibility:** Private or Public as needed.
5. **Do not** add README / `.gitignore` / license if you already have a local project and want a clean first push (avoids merge gymnastics).  
   - If GitHub created a README, either delete that commit on GitHub or pull and merge once.

---

## 2. Local Git (important)

- Initialize Git **inside the app folder only** (e.g. `P4U-New/p4u-admin-web`), not under `C:\Users\...`.
- Add a proper **`.gitignore`** before the first commit (`node_modules/`, `dist/`, `.env*`, `.vite/`, etc.).
- First commit, then connect remote:

```bash
cd path/to/your-app
git init -b main
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/PlanextConsole/YOUR-REPO.git
git push -u origin main
```

### If push returns 403

- GitHub is using the wrong account. Use a **PAT** (Fine-grained or classic with `repo`) or **SSH** for a user that has **write** access to the org repo.
- Or use: `git remote set-url origin git@github.com:PlanextConsole/YOUR-REPO.git`

---

## 3. GitHub Actions — what to add on each repo

Enable **Actions** in the repo (**Settings → Actions → General**) if restricted.

### Frontends (Vite + React / Next — Node)

Create **`.github/workflows/ci.yml`** in that repo with:

- **Triggers:** `push` and `pull_request` to `main` (and `develop` if you use it).
- **Jobs:**
  - Checkout
  - `actions/setup-node` with your Node version (e.g. **20**), cache **npm**
  - `npm ci`
  - `npm run lint` (if the project has a lint script; use `continue-on-error` or omit if not)
  - `npm run build`

### Backend services (Node / TypeScript)

Same pattern; replace build step with `npm run build` and add `npm test` if you have tests.

### Secrets (only if workflows need them)

- **Settings → Secrets and variables → Actions**  
- Examples: `NPM_TOKEN`, deploy keys, cloud credentials — **never** commit secrets in YAML.

---

## 4. Template: CI for Vite/React (copy per repo)

Save as **`.github/workflows/ci.yml`** and adjust Node version or script names if needed.

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - run: npm ci
      - run: npm run lint --if-present
      - run: npm run build
```

For **Next.js**, keep `npm run build`; add any required **env vars** as repository **Variables** or **Secrets** if the build reads them at build time.

---

## 5. Optional: branch protection (org policy)

On GitHub: **Settings → Branches → Add rule** for `main`:

- Require pull request before merging
- Require status checks (e.g. **CI** job) to pass

---

## 6. Quick copy checklist (every new repo)

| Step | Done |
|------|------|
| Repo created under correct org | ☐ |
| `.gitignore` correct before first commit | ☐ |
| `git init` only inside project root | ☐ |
| `origin` URL correct; push works | ☐ |
| `.github/workflows/ci.yml` added | ☐ |
| Actions runs green on `main` | ☐ |
| Branch protection (if required) | ☐ |

---

## Reference

- **Admin web (example):** `https://github.com/PlanextConsole/p4u-admin-web`
- Reuse the same **CI YAML** shape for **user web** and other Node frontends; only Node version or scripts may differ.

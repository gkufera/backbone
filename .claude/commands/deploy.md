Deploy the current main branch to production.

Steps:
1. Ensure we're on main branch: `git checkout main`
2. Ensure working directory is clean: `git status`
3. Run Tier 1 tests:
   ```bash
   cd frontend && npm test
   cd ../backend && npm test
   ```
4. If all tests pass, merge and push:
   ```bash
   git checkout production
   git merge main --no-edit
   git push origin production
   git checkout main
   ```
5. Report: "✅ Deployed to production" or "❌ Deploy failed: [reason]"

If any step fails, STOP and report the failure. Do not force push or skip tests.

# Submission readiness

- [x] Local agent service and three-tool MCP implementation.
- [x] Official SDK integration code, no application direct-execution fallback.
- [x] Injection fixtures, protected sandbox marker, execution receipts and history.
- [x] Dashboard and setup materials.
- [ ] Authorized ArmorIQ organization API key configured.
- [ ] Agent registered/onboarded with correct supported framework metadata.
- [ ] MCP registered/onboarded, discovered tools and secure proxy connectivity confirmed.
- [ ] Policy assigned and active: permitted reads, explicit restricted-tool deny.
- [ ] Model API spend authorized and live model tool selection confirmed.
- [ ] Live acceptance passes with genuine allowed read and proxy-stage policy denial.
- [ ] Protected marker and receipt absence verified for the denied run.
- [ ] Platform audit export matched to timestamps and plan/token IDs; policy configuration included.
- [ ] Genuine sanitized evidence package reviewed for secrets.
- [ ] GitHub repository created and published using an authorized account.
- [ ] Video recorded, duration checked <=90 seconds, uploaded with account authorization.
- [ ] Current official hackathon rules checked; final form completed with actual links.

Run final checks described in README. Local tests cannot check the mandatory live boxes. If live acceptance fails, inspect stored evidence and platform audit logs; fix policy or connectivity and rerun. Do not relabel missing configuration or technical failures as blocks.

Publication from the verified local path, after review and account authorization:

```powershell
git status --short
git add .
git diff --cached
git commit -m "Build RepoSentry enforcement lab"
```

Create an empty repository in your authorized GitHub account. Then use its exact URL:

```powershell
git remote add origin <YOUR_REPOSITORY_URL>
git push -u origin main
```

Do not commit `.env`, runtime evidence with unsanitized content, or secret exports. No substantial starter template or pre-existing app code was used; disclose third-party SDKs and libraries. The supplied hackathon dates/criteria have not been independently confirmed from a hackathon organizer page.

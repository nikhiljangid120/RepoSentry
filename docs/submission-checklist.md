# Submission readiness

- [x] Local agent service and three-tool MCP implementation.
- [x] Official SDK integration code, no application direct-execution fallback.
- [x] Injection fixtures, protected sandbox marker, execution receipts and history.
- [x] Dashboard and setup materials.
- [x] Authorized ArmorIQ organization API key configured.
- [x] Agent registered/onboarded with correct supported framework metadata.
- [x] MCP registered/onboarded, discovered tools and secure proxy connectivity confirmed.
- [x] Policy assigned and active: permitted reads, explicit restricted-tool deny.
- [x] Model API spend authorized and live model tool selection confirmed.
- [x] Live acceptance passes with genuine allowed read and proxy-stage policy denial.
- [x] Protected marker and receipt absence verified for the denied run.
- [ ] Separate invocation audit export: platform Audit Log currently reports no records. Event Log plan IDs match the recorded SDK results; actual policy and screenshots are included.
- [x] Genuine sanitized evidence package reviewed for secrets.
- [x] GitHub repository created and published using an authorized account.
- [x] Original <=90-second video prepared, duration checked at 80 seconds, reviewed and uploaded to GitHub release.
- [x] Newer required 3–5-minute video: 3:37 narrated version published Unlisted on YouTube, https://youtu.be/jThbzoZPyGM. YouTube copyright checks found no issues.
- [x] Public live demo deployed on Render Free and real hosted MCP/policy acceptance passed: https://reposentry-8c31.onrender.com
- [x] ArmorTools Pro activation verified in the console.
- [x] Authorized X post published with required tag/hashtag: https://x.com/JangidJohny/status/2110301999493439934
- [x] Current official hackathon rules checked; final form completed with actual links and submitted. The form confirmed: "Thanks for submitting. You'll hear from us after judging closes."

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

Do not commit `.env`, runtime evidence with unsanitized content, or secret exports. No substantial starter template or pre-existing app code was used; disclose third-party SDKs and libraries. The official final form has been reviewed; remaining pages and final submission are pending Pro entitlement verification.

Team: RepoSentry, solo. Google form sign-in and verified Pro declaration are complete. Actual repository, hosted app, accepted-host video and X-post links were submitted with evidence-backed takeaways and Codex disclosure. Final confirmation was observed and saved in docs/screenshots/submission-confirmation.png. The official Discord announces a deadline of October 17 at 11:59 PM IST and live-demo availability October 17–21. See organizer-updates.md for the original/newer video-length conflict and actual sources.

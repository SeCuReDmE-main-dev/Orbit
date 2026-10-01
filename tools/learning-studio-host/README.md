# Additional Orbit formation Studio host

This isolated host installs the actual portable `.tgz` and serves it at
`https://orbit.securedme.ca/formation/studio/`. It uses the existing
`pzscx4w8/production` project and the visitor's normal Sanity session and rights.
It does not modify the original `/studio/`, the landing, project membership,
Sanity CORS, or permissions. No token belongs in these configuration files.

The CLI base path is `/formation/studio`; the workspace path is `/`. Sanity joins
these paths, as explained in its [self-hosting documentation](https://www.sanity.io/docs/studio/deployment).
The directory-local `.htaccess` restores deep tool routes while preserving real
static files. Its noindex directive does not protect private data.

Build after packaging the plugin in E2B only:

```sh
python tools/learning-studio-host/build_host.py --environment e2b
```

The retained `package-lock.json` comes from the credential-free second-Studio
installation graph. Only the root package name and archive location were adapted.
During the E2B build, the archive's integrity is bound to the newly packaged bytes;
all registry versions and integrity entries are preserved. Node 22.20.0 is
downloaded with its verified checksum. `npm ci` uses an isolated home and cache.
The host consumes the archive, not a source/workspace alias.

`host-build-status.json` records hashes and construction facts. It is not a
browser, authenticated-session, permission, or publication test. The formation
release packages only the resulting `dist` under `/formation/studio/`, including
its local rewrite file. No dependency tree or build credentials are published.

Authenticated QA URLs:

- `/formation/studio/orbit-learning-lab/mission/1`
- `/formation/studio/orbit-learning-projects/files/1`
- `/formation/studio/orbit-learning-projects/sharing/1`

Use synthetic artifacts and a synthetic private reflection only. Test navigation,
ZIP integrity, versions, persistence, shared selections and actual WebMCP tools.
For publication, select a synthetic public artifact, inspect destination and JSON,
and verify the private reflection is absent. Do not invent a human acknowledgement
or publish a private journal. A preview pass does not prove a real write or a
server-side rejection for a read-only account.

The browser reuses the same origin as the existing Studio, so this mount adds no
new Sanity CORS origin. Reuse of a current login must still be observed. It also
does not prove cross-origin course transport: `/api/v1/course-context/*` is a
separate, credential-free public GET surface, disabled by default. Keep its
availability and cross-origin result separate from authenticated Studio QA.

The shortest real QA route is:

1. Open the original authenticated `/studio/`, then the new Lab URL in the same
   browser profile. Record whether the normal session opens the new host; do not
   copy authentication tokens to a test worker. Check project/dataset and use no
   private account details in the receipt.
2. Import a valid synthetic Colab ZIP, then its tampered version. Verify the first
   adds the declared payloads and the second adds nothing. Create a new version,
   compute its digest, explicitly save/export, and reopen with fresh permissions.
3. Inspect twenty-five actual registered tools if the browser supports WebMCP.
   Test a private read refusal, share only a synthetic artifact, read it, revoke
   the grant, and leave the host to verify cleanup. Keep the human fallback
   separate if native WebMCP is unavailable.
4. In Sharing, prepare a preview of the synthetic public artifact only. Check
   `pzscx4w8/production`, selected content and absence of the private reflection.
   Leave the acknowledgement unchecked; change the revision or revoke permission
   and verify the preview becomes invalid. This route makes no Content Lake write.

Because project, dataset and user are deliberately unchanged, both mounts use the
same local namespace for that identity. A different URL is not a privacy boundary.
The new host starts in memory and requires an explicit choice to restore any
saved work. Account/project/dataset changes still use separate namespaces.

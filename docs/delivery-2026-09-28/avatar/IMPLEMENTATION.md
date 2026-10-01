# Avatar implementation receipt — 2026-09-28

## Scope and conservation

Repository: `dev.to-challenge`; branch `master`; starting HEAD `3c6806b9cb77b81b5bea2e3debb7146f5ee0b821`.
Implementation by Codex directly, without subagents. Education and Synthia references read only. No authentication, research, Sanity corpus, NASA work, application default asset, dependency manifest or lockfile edited in this avatar work.

The repository already contained extensive tracked and untracked changes. A scoped recoverable ZIP and its receipt were saved under `.orbit/backups/avatar-20260928T120938Z/` before edits. Entry bytes were checked against the source SHA-256 manifest. No commit, push, deployment or destructive Git operation.

Baseline asset: `web/public/presence-review/orbit-study.glb`; SHA-256 `bdb21c1d62d21d92f1e0d5de3db3883cae947b3f356600275140209bfbaf1e94`. Still unchanged after the work. See `baseline-audit.json`: 272,522 triangles, 333 primitives, 11,925,404 bytes. It fails the newly proposed geometry, primitive and size budgets.

## Changed implementation

- `packages/synthia-presence/src/holographic.ts`: PBR material clones and surface-aligned stippling, face protection, shader-compatible skinning and morphing.
- `packages/synthia-presence/src/index.ts`: explicit `holographic`/`clay` modes, neutral studio lighting, optional decorative environment, turntable, diagnostics and return to the previous material after scatter. Holographic mode updates the animation mixer and morph weights; legacy particle mode is unchanged as the application's default. Profile review is 90 degrees; three-quarter review is 45 degrees.
- `web/src/pages/avatar-review.astro`: independent review route; only displays a 3D candidate if a local GLB is present in its manifest. Reference image and blocked export are explicitly labelled. It does not log in, call an AI provider, use a microphone or perform research.
- `web/public/avatar-review/candidate.json`: current `blocked_external` state, no model URL, not approved for application.
- `tests/presence-holographic.test.ts`: original PBR preservation, shader compatibility with deformation and face clarity attributes.
- `tools/audit_presence_asset.py`: self-contained GLB audit and budget receipt.
- `tools/prepare_avatar_candidate.py`: static-mesh-only Blender preparation; reject rigged inputs rather than destroy existing deformation data; preserve raw original, retain imported PBR maps, bound geometry/textures, save editable `.blend` and embedded GLB.

The new holographic mode fixes the rendering path's frozen-expression limitation. It does **not** repair the old model's anatomy or create facial morph targets on a new static mesh.

## Generation and external blocker

One generation in the official Microsoft TRELLIS.2 Space produced a preview. Image uploaded manually by Jean-Sébastien after the browser tool rejected programmatic upload outside its configured roots. Parameters and input fingerprint are in `generation-receipt.json`.

At the first Extract GLB request, Hugging Face displayed `You've hit your daily ZeroGPU limit` and the extraction view showed `Error`. No GLB URL or downloaded model was obtained. No repeated extraction, upgrade, recharge or alternative account was used. The account's reset time was not exposed and is not asserted.

Render-style and angle controls were exercised on the completed preview. The ceramic silhouette and mechanical neck/skull are promising in the observed views; eye contours and lips remain visibly imperfect. This is a subjective visual assessment of remote preview images, not an audit of the generated mesh. No final RagGgE scores are assigned before the mesh exists locally.

Screenshot display worked in the conversation. Saving screenshots through ECC was rejected by that tool's configured filesystem roots; no saved screenshot file or screenshot hash is claimed.

## Executed validation

Environment observed: Node v24.18.1, npm 11.16.0 (repository declares npm 10.9.4; no version change performed), Blender 4.5.9 LTS. Astro 7.3.3; Three.js r181. Intel UHD 620 is the reported target adapter from the preceding inspection; no candidate performance result is inferred from that hardware statement.

| Command or check | Observed result |
| --- | --- |
| `npm.cmd test` | 63 Vitest tests across 23 files and 5 Node policy tests passed earlier in this implementation. |
| `npm.cmd exec -- vitest run tests/synthia-presence.test.ts tests/presence-particles.test.ts tests/presence-holographic.test.ts` | 8/8 passed after renderer changes. |
| `npm.cmd exec -- tsc --noEmit --target ES2022 --module ESNext --moduleResolution Bundler --lib ES2022,DOM --skipLibCheck packages/synthia-presence/src/index.ts packages/synthia-presence/src/holographic.ts packages/synthia-presence/src/particles.ts` | Exit 0. |
| `npm.cmd run build --workspace @orbit/web` | Exit 0, 9 static routes including `/avatar-review/`. Existing >500 kB bundle warning remains. |
| `python -m py_compile tools/audit_presence_asset.py tools/prepare_avatar_candidate.py` | Exit 0. |
| Blender preparation on a generated UV sphere | Exit 0; 79,000 / 29,000 triangles and one primitive. Both artifacts audited within the proposed geometry/size limits. **Synthetic tooling check only**; no materials or face involved. |
| Browser: current model in holographic mode | Loaded. Actual mesh morph weight `blink=0.7` observed after input; no shader compilation failure observed. |
| Browser: scatter and reform | Appearance switched `holographic → particles → holographic`. |
| Browser: 390 × 844 viewport | Document width 390; no horizontal overflow; single-column layout. |
| Browser: simulated absence of WebGL | Explicit unavailable message; return link to Orbit and reference content remain accessible. This is a controlled negative test, not a failure of the GPU. |

Development preview initially emitted an outdated optimized-dependency 504 and a 404. The built preview eliminated the module-loading 504; an initial 404 remained in console history. No clean-console claim is made. Neither error is a generated-mesh result. Dynamic screenshots on this heavy baseline can be slow.

Frame intervals were sampled during interactive checks, including switching modes and compiling shaders. These are **not** a stable benchmark and do not establish the <=33 ms p95 goal. Both-host rendering also differs from a single character in Orbit. Candidate performance, GPU disposal under repeated mount/unmount and real candidate expressions remain unverified.

## Resume commands once the real GLB has been downloaded

Run from the Orbit repository; replace the input name with the observed download. These are future commands, not a claim that the candidate was processed:

```powershell
python tools/audit_presence_asset.py assets/orbit-avatar/candidates/trellis2-seed42-raw.glb --receipt docs/delivery-2026-09-28/avatar/candidate-raw-audit.json
```

Then use the installed Blender 4.5.9 LTS executable:

```powershell
& '..\orbit-private-tools\blender-4.5.9-windows-x64\blender.exe' --background --python tools/prepare_avatar_candidate.py -- --input assets/orbit-avatar/candidates/trellis2-seed42-raw.glb --output assets/orbit-avatar/prepared/seed42
```

Audit high and low exports separately; review texture dimensions, seams and decimation losses visually. Do not set `approvedForApplication` based only on numeric budgets. Retopology, eye separation and facial animation are subsequent work on the chosen base, followed by the user’s visual gate and browser integration checks.

## Gate status

| Gate | Status |
| --- | --- |
| Conservation and reference preparation | Observed complete |
| First remote generation preview | Observed complete |
| GLB acquisition | BLOCKED_EXTERNAL — free quota |
| Blender artistic finish and facial rig | Blocked by missing GLB |
| Review surface / holographic support | Implemented and locally checked on baseline |
| Two-host candidate proof and Web performance | To test |
| User visual approval / production replacement | Not reached |

Primary references retained from the approved research: [Microsoft TRELLIS.2](https://github.com/microsoft/TRELLIS.2), [model card](https://huggingface.co/microsoft/TRELLIS.2-4B), [ZeroGPU](https://huggingface.co/docs/hub/spaces-zerogpu), [Blender glTF export](https://docs.blender.org/manual/en/latest/addons/import_export/scene_gltf2.html). Generator licensing does not independently establish rights in arbitrary input images; retain the canonical reference provenance.

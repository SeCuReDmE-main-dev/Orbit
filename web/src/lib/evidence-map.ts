import * as THREE from "three";
import type { Dossier } from "../../../packages/evidence-review/src/index";
/** Deterministic projection of declared evidence relations, never a truth or similarity score. */
export function mountEvidenceMap(
  host: HTMLElement,
  d: Dossier,
  select: (type: string, id: string) => void,
): () => void {
  const canvas = host.querySelector("canvas")!,
    status = host.querySelector<HTMLElement>("[data-map-status]")!,
    events = new AbortController();
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
  } catch {
    status.textContent =
      "WebGL indisponible. Les boutons ci-dessous donnent accès aux mêmes fiches.";
    canvas.hidden = true;
    return () => events.abort();
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  const scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100),
    group = new THREE.Group();
  scene.add(group);
  camera.position.set(0, 0, 14);
  const objects: THREE.Mesh[] = [],
    byId = new Map<string, THREE.Vector3>(),
    materials: THREE.Material[] = [],
    geometries: THREE.BufferGeometry[] = [];
  const add = (
    id: string,
    type: string,
    index: number,
    total: number,
    radius: number,
    color: number,
  ) => {
    const angle = (index / Math.max(total, 1)) * Math.PI * 2 - Math.PI / 2,
      pos = new THREE.Vector3(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        0,
      );
    byId.set(`${type}:${id}`, pos);
    const geo = new THREE.SphereGeometry(type === "claim" ? 0.16 : 0.1, 16, 12),
      mat = new THREE.MeshBasicMaterial({ color }),
      mesh = new THREE.Mesh(geo, mat);
    geometries.push(geo);
    materials.push(mat);
    mesh.position.copy(pos);
    mesh.userData = { id, type };
    objects.push(mesh);
    group.add(mesh);
  };
  d.axes.forEach((_, i) =>
    add(`axis_${i}`, "axis", i, d.axes.length, 0.65, 0xffc97a),
  );
  d.claims.forEach((c, i) =>
    add(c.id, "claim", i, d.claims.length, 1.8, 0xbd98ff),
  );
  d.sources.forEach((s, i) =>
    add(s.id, "source", i, d.sources.length, 4, 0x68dcff),
  );
  for (const claim of d.claims)
    for (const evidence of claim.evidence) {
      const a = byId.get(`claim:${claim.id}`),
        b = byId.get(`source:${evidence.sourceId}`);
      if (!a || !b) continue;
      const geo = new THREE.BufferGeometry().setFromPoints([a, b]),
        mat = new THREE.LineBasicMaterial({
          color: evidence.relation === "contradicts" ? 0xffc97a : 0x576697,
          opacity: 0.65,
          transparent: true,
        });
      geometries.push(geo);
      materials.push(mat);
      const line = new THREE.Line(geo, mat);
      line.userData.relation = evidence.relation;
      group.add(line);
    }
  for (const c of d.claims)
    for (const id of c.axisIds ?? []) {
      const a = byId.get(`axis:${id}`),
        b = byId.get(`claim:${c.id}`);
      if (!a || !b) continue;
      const geo = new THREE.BufferGeometry().setFromPoints([a, b]),
        mat = new THREE.LineBasicMaterial({
          color: 0xffc97a,
          transparent: true,
          opacity: 0.3,
        });
      geometries.push(geo);
      materials.push(mat);
      group.add(new THREE.Line(geo, mat));
    }
  const render = () => {
      if (!document.hidden) renderer.render(scene, camera);
    },
    resize = () => {
      const { width, height } = host.getBoundingClientRect();
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
      render();
    };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  let down: { x: number; y: number; gx: number; gy: number } | undefined,
    moved = false;
  const ray = new THREE.Raycaster(),
    pointer = new THREE.Vector2();
  canvas.addEventListener(
    "pointerdown",
    (e) => {
      down = {
        x: e.clientX,
        y: e.clientY,
        gx: group.position.x,
        gy: group.position.y,
      };
      moved = false;
      canvas.setPointerCapture(e.pointerId);
    },
    { signal: events.signal },
  );
  canvas.addEventListener(
    "pointermove",
    (e) => {
      if (!down) return;
      const dx = e.clientX - down.x,
        dy = e.clientY - down.y;
      moved ||= Math.hypot(dx, dy) > 6;
      group.position.x = Math.max(-5, Math.min(5, down.gx + dx / 70));
      group.position.y = Math.max(-4, Math.min(4, down.gy - dy / 70));
      render();
    },
    { signal: events.signal },
  );
  canvas.addEventListener(
    "pointerup",
    (e) => {
      if (down && !moved) {
        const r = canvas.getBoundingClientRect();
        pointer.set(
          ((e.clientX - r.left) / r.width) * 2 - 1,
          (-(e.clientY - r.top) / r.height) * 2 + 1,
        );
        ray.setFromCamera(pointer, camera);
        const hit = ray.intersectObjects(objects)[0];
        if (hit) select(hit.object.userData.type, hit.object.userData.id);
      }
      down = undefined;
    },
    { signal: events.signal },
  );
  canvas.addEventListener(
    "pointercancel",
    () => {
      down = undefined;
    },
    { signal: events.signal },
  );
  canvas.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "r" || e.key === "Home") {
        group.position.set(0, 0, 0);
        render();
      }
    },
    { signal: events.signal },
  );
  host
    .closest(".wide")
    ?.querySelector<HTMLSelectElement>("[data-map-filter]")
    ?.addEventListener(
      "change",
      (event) => {
        const value = (event.target as HTMLSelectElement).value;
        group.children.forEach((child) => {
          if (child.userData.relation)
            child.visible = !value || child.userData.relation === value;
        });
        render();
      },
      { signal: events.signal },
    );
  document.addEventListener("visibilitychange", render, {
    signal: events.signal,
  });
  resize();
  if (!objects.length)
    status.textContent =
      "Ajoutez des sources et des affirmations pour voir leurs relations.";
  return () => {
    events.abort();
    observer.disconnect();
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    renderer.dispose();
  };
}

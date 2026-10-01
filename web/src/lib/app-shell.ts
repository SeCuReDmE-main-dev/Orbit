import { readSession, mutateOrbit, type OrbitSession } from "./orbit-session";
import { mountWorkspaceSurface } from './workspace-surface';
declare global {
  interface Window {
    orbitSession?: OrbitSession;
  }
}
const viewTitles: Record<string, string> = {
  companion: "Orbit",
  research: "Recherches",
  library: "Bibliothèque",
  report: "Rapport",
  settings: "Réglages",
  lab: "Laboratoire",
};
export function mountAppShell() {
  const shell = document.querySelector<HTMLElement>("[data-app-shell]")!;
  const gate = document.querySelector<HTMLElement>("[data-auth-gate]")!;
  const storage = document.querySelector<HTMLDialogElement>(
    "[data-storage-dialog]",
  )!;
  const local = document.querySelector<HTMLInputElement>(
    "[data-storage-local]",
  )!;
  const tutorial = document.querySelector<HTMLDialogElement>(
    "[data-tutorial-dialog]",
  )!;
  const tutorialOffer = document.querySelector<HTMLDialogElement>('[data-tutorial-offer]')!;
  let session: OrbitSession | undefined,
    step = 0;
  const sizeToggle = document.createElement('button');
  shell.querySelectorAll<HTMLElement>('[data-view-panel]:not([data-view-panel=companion])').forEach(panel=>{
    const close=document.createElement('a');
    close.href='/app/?view=companion';close.dataset.viewLink='companion';close.className='workspace-close';
    close.setAttribute('aria-label','Fermer cette vue et retrouver Orbit');close.textContent='×';panel.prepend(close);
  });
  sizeToggle.type = 'button'; sizeToggle.className = 'panel-size-toggle';
  sizeToggle.textContent = 'Agrandir la vue ↗'; sizeToggle.setAttribute('aria-pressed','false');
  shell.querySelector('.app-header-right')?.prepend(sizeToggle);
  sizeToggle.addEventListener('click',()=>{
    const expanded = shell.dataset.panelExpanded !== 'true';
    shell.dataset.panelExpanded = String(expanded);
    sizeToggle.setAttribute('aria-pressed',String(expanded));
    sizeToggle.textContent = expanded ? 'Réduire la vue ↙' : 'Agrandir la vue ↗';
  });
  const showView = (view: string, navigate = false) => {
    if (!(view in viewTitles)) view = "companion";
    shell.dataset.view = view;
    shell.dataset.surfaceOpen = String(view !== 'companion' || shell.dataset.conversationOpen === 'true');
    shell
      .querySelectorAll<HTMLElement>("[data-view-panel]")
      .forEach((panel) => {
        panel.hidden = panel.dataset.viewPanel !== view;
      });
    shell
      .querySelectorAll<HTMLAnchorElement>("[data-view-link]")
      .forEach((link) => {
        if (link.dataset.viewLink === view)
          link.setAttribute("aria-current", "page");
        else link.removeAttribute("aria-current");
      });
    shell.querySelector<HTMLElement>("[data-view-title]")!.textContent =
      viewTitles[view];
    document.title = `${viewTitles[view]} — Orbit`;
    if (navigate) {
      const url = new URL(location.href);
      url.searchParams.set("view", view);
      history.pushState({ view }, "", url);
      document.dispatchEvent(
        new CustomEvent("orbit:view-change", { detail: { view } }),
      );
    }
  };
  document
    .querySelectorAll<HTMLAnchorElement>("[data-view-link]")
    .forEach((link) =>
      link.addEventListener("click", (event) => {
        if (
          event.ctrlKey ||
          event.metaKey ||
          event.shiftKey ||
          event.altKey ||
          event.button !== 0
        )
          return;
        event.preventDefault();
        showView(link.dataset.viewLink!, true);
      }),
    );
  window.addEventListener("popstate", () =>
    showView(new URLSearchParams(location.search).get("view") ?? "companion"),
  );
  showView(new URLSearchParams(location.search).get("view") ?? "companion");
  const conversationToggle=shell.querySelector<HTMLButtonElement>('[data-conversation-open]')!;
  const setConversation=(open:boolean,focus=true)=>{
    shell.dataset.conversationOpen=String(open);
    shell.dataset.surfaceOpen=String(open || shell.dataset.view!=='companion');
    conversationToggle.setAttribute('aria-expanded',String(open));
    if(open){
      showView('companion',shell.dataset.view!=='companion');
      if(focus)document.querySelector<HTMLTextAreaElement>('#companion-question')?.focus();
    } else conversationToggle.focus();
  };
  conversationToggle.addEventListener('click',()=>setConversation(true));
  shell.querySelector('[data-conversation-close]')!.addEventListener('click',()=>setConversation(false));
  document.addEventListener('orbit:open-conversation',()=>setConversation(true,false));
  const tutorialKey=()=>`orbit.tutorial-choice.${session?.user?.id??''}`;
  const offerTutorial=()=>{
    if(!session?.user||storage.open||tutorial.open||tutorialOffer.open)return;
    try{if(localStorage.getItem(tutorialKey()))return;}catch{/* Ask without persisting a preference. */}
    tutorialOffer.showModal();
  };
  const rememberTutorial=()=>{try{localStorage.setItem(tutorialKey(),'offered');}catch{/* No research data stored. */}};
  storage.addEventListener('close',offerTutorial);
  tutorialOffer.addEventListener('close',rememberTutorial);
  tutorialOffer.querySelector('[data-tutorial-skip]')!.addEventListener('click',()=>tutorialOffer.close());
  tutorialOffer.querySelector('[data-tutorial-start]')!.addEventListener('click',()=>{
    tutorialOffer.close();step=0;renderStep();tutorial.showModal();
  });
  const updateStorage = () => {
    local.checked = session?.storageConsent.local === true;
    document.querySelector<HTMLElement>("[data-storage-status]")!.textContent =
      local.checked
        ? "Copie locale autorisée sur cet appareil."
        : "Cloud uniquement. Aucune base de recherche locale autorisée.";
  };
  const consentKey = () => `orbit.storage-choice.${session?.user?.id ?? ""}`;
  const saveConsent = async (allow: boolean) => {
    if (!session?.user) return;
    const buttons = storage.querySelectorAll<HTMLButtonElement>("button");
    buttons.forEach((button) => {
      button.disabled = true;
    });
    const status = document.querySelector<HTMLElement>(
      "[data-consent-status]",
    )!;
    status.textContent = "Enregistrement de votre choix…";
    try {
      await mutateOrbit(
        "/api/v1/storage-consent",
        "PUT",
        { local: allow },
        session,
      );
      session.storageConsent = { local: allow, decided: true };
      window.orbitSession = session;
      try {
        localStorage.setItem(consentKey(), allow ? 'local' : 'cloud');
      } catch {
        /* Preference can be requested next time. */
      }
      updateStorage();
      document.dispatchEvent(
        new CustomEvent("orbit:storage-consent", { detail: { local: allow } }),
      );
      storage.close();
      status.textContent = "";
    } catch (error) {
      status.textContent =
        error instanceof Error ? error.message : "Choix non enregistré.";
      updateStorage();
    } finally {
      buttons.forEach((button) => {
        button.disabled = false;
      });
    }
  };
  document
    .querySelector("[data-storage-allow]")!
    .addEventListener("click", () => {
      void saveConsent(true);
    });
  document
    .querySelector("[data-storage-decline]")!
    .addEventListener("click", () => {
      void saveConsent(false);
    });
  document
    .querySelector("[data-storage-review]")!
    .addEventListener("click", () => storage.showModal());
  local.addEventListener("change", () => {
    if (local.checked) {
      local.checked = false;
      storage.showModal();
    } else void saveConsent(false);
  });
  storage.addEventListener("cancel", () => {
    updateStorage();
  });
  const authenticate = async () => {
    gate.hidden = false;
    shell.hidden = true;
    document.querySelector<HTMLElement>("[data-gate-actions]")!.hidden = true;
    try {
      session = await readSession();
      if (!session.user) {
        location.replace("/?auth=required");
        return;
      }
      window.orbitSession = session;
      // The account preference alone cannot authorize storage on a new device.
      let deviceChoice: string | null = null;
      try { deviceChoice = localStorage.getItem(consentKey()); } catch { /* Ask on this device. */ }
      session.storageConsent.local = session.storageConsent.local && deviceChoice === 'local';
      session.storageConsent.decided = deviceChoice === 'local' || deviceChoice === 'cloud';
      document.querySelector<HTMLElement>("[data-user-name]")!.textContent =
        session.user.name || "Votre compte";
      document.querySelector<HTMLElement>("[data-user-email]")!.textContent =
        session.user.email;
      document.querySelector<HTMLElement>("[data-user-initial]")!.textContent =
        (session.user.name || session.user.email).slice(0, 1).toUpperCase();
      updateStorage();
      gate.hidden = true;
      shell.hidden = false;
      document.dispatchEvent(
        new CustomEvent("orbit:session-ready", { detail: { session } }),
      );
      let decided =
        session.storageConsent.decided === true || session.storageConsent.local;
      if (!decided && !storage.open) storage.showModal();
      else offerTutorial();
      const { registerReadOnlyOrbitTools } = await import("./webmcp");
      const value = await registerReadOnlyOrbitTools();
      const status = document.querySelector<HTMLElement>(
        "[data-webmcp-status]",
      )!;
      status.textContent =
        value === "registered"
          ? "Outils disponibles · partage sous votre contrôle."
          : "Agent de navigateur non disponible dans cette session.";
    } catch {
      window.orbitSession = undefined;
      session = undefined;
      shell.hidden = true;
      gate.hidden = false;
      document.querySelector<HTMLElement>(
        "[data-auth-gate-title]",
      )!.textContent = "Votre espace reste privé.";
      document.querySelector<HTMLElement>(
        "[data-auth-gate-status]",
      )!.textContent =
        "Le service de connexion est indisponible. Nous ne pouvons pas confirmer votre session.";
      document.querySelector<HTMLElement>("[data-gate-actions]")!.hidden =
        false;
    }
  };
  document
    .querySelector("[data-session-retry]")!
    .addEventListener("click", () => {
      void authenticate();
    });
  document
    .querySelector<HTMLButtonElement>("[data-logout]")!
    .addEventListener("click", async (event) => {
      if (!session) return;
      const button = event.currentTarget as HTMLButtonElement;
      button.disabled = true;
      try {
        await mutateOrbit("/api/v1/logout", "POST", {}, session);
        document.dispatchEvent(new CustomEvent("orbit:logout"));
        window.orbitSession = undefined;
        location.replace("/");
      } catch {
        document.querySelector<HTMLElement>(
          "[data-logout-status]",
        )!.textContent =
          "Déconnexion non confirmée. Réessayez lorsque le service sera disponible.";
        button.disabled = false;
      }
    });
  document.addEventListener("orbit:session-expired", () => {
    shell.hidden = true;
    window.orbitSession = undefined;
    location.replace("/?auth=expired");
  });
  const tutorialSteps = [
    [
      "Commencez par une question.",
      "Orbit vous accompagne depuis la conversation. Ajoutez le contexte qui compte, puis choisissez votre agent avant d’envoyer.",
    ],
    [
      "Gardez le fil des sources.",
      "Retrouvez vos recherches et votre bibliothèque dans la navigation. Une source découverte reste une piste tant que vous ne l’avez pas examinée.",
    ],
    [
      "Faites-en votre propre rapport.",
      "Relisez et corrigez votre rapport, puis exportez-le. Vos réglages permettent de choisir le stockage local et vos connexions.",
    ],
  ];
  const renderStep = () => {
    document.querySelector("[data-tutorial-step]")!.textContent =
      `0${step + 1} / 03`;
    document.querySelector("[data-tutorial-title]")!.textContent =
      tutorialSteps[step][0];
    document.querySelector("[data-tutorial-copy]")!.textContent =
      tutorialSteps[step][1];
    document.querySelector<HTMLButtonElement>(
      "[data-tutorial-back]",
    )!.disabled = step === 0;
    document.querySelector("[data-tutorial-next]")!.textContent =
      step === 2 ? "À moi d’explorer ↗" : "Continuer ↗";
    tutorial
      .querySelectorAll(".tutorial-progress i")
      .forEach((dot, index) => dot.classList.toggle("active", index === step));
  };
  document.querySelectorAll("[data-tutorial-open]").forEach((button) =>
    button.addEventListener("click", () => {
      step = 0;
      renderStep();
      tutorial.showModal();
    }),
  );
  document
    .querySelector("[data-tutorial-close]")!
    .addEventListener("click", () => tutorial.close());
  document
    .querySelector("[data-tutorial-back]")!
    .addEventListener("click", () => {
      step = Math.max(0, step - 1);
      renderStep();
    });
  document
    .querySelector("[data-tutorial-next]")!
    .addEventListener("click", () => {
      if (step === 2) {
        tutorial.close();
        return;
      }
      step++;
      renderStep();
    });
  document
    .querySelector("[data-report-export]")!
    .addEventListener("click", () => {
      const report = document
        .querySelector<HTMLTextAreaElement>("[data-report-body]")!
        .value.trim();
      const status = document.querySelector<HTMLElement>(
        "[data-report-status]",
      )!;
      if (!report) {
        status.textContent =
          "Votre rapport est encore vide. Commencez une recherche avec Orbit.";
        return;
      }
      const title =
        document
          .querySelector<HTMLInputElement>("[data-workspace-title]")!
          .value.trim() || "Rapport Orbit";
      const references = Array.from(
        document.querySelectorAll<HTMLAnchorElement>("[data-report-sources] a"),
      )
        .map((link) => `- ${link.textContent}: ${link.href}`)
        .join("\n");
      const blob = new Blob(
        [
          `# ${title}\n\n${report}\n${references ? `\n## Références\n\n${references}\n` : ""}`,
        ],
        { type: "text/markdown;charset=utf-8" },
      );
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "orbit-rapport.md";
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      status.textContent = "Votre rapport a été préparé pour téléchargement.";
    });
  mountWorkspaceSurface(shell);
  void authenticate();
}

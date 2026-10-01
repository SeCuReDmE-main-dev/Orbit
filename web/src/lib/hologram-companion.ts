import { mountPresence } from "../../../packages/synthia-presence/src/index";

type State = "idle" | "thinking" | "speaking" | "listening" | "error";
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult:
    | ((event: {
        results: ArrayLike<ArrayLike<{ transcript: string }>>;
      }) => void)
    | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  abort(): void;
};

/** Adapts consent-aware Orbit voice and activity events to the portable presentation engine. */
export function mountHologramCompanion(root: HTMLElement) {
  if (root.dataset.mounted) return;
  root.dataset.mounted = "true";
  const canvas = root.querySelector<HTMLCanvasElement>(
    "[data-hologram-canvas]",
  )!;
  const fallback = root.querySelector<HTMLElement>("[data-hologram-fallback]")!;
  const label = root.querySelector<HTMLElement>("[data-hologram-state]")!;
  const status = root.querySelector<HTMLElement>(
    "[data-hologram-voice-status]",
  )!;
  const speak = root.querySelector<HTMLButtonElement>("[data-hologram-speak]")!;
  const stop = root.querySelector<HTMLButtonElement>("[data-hologram-stop]")!;
  const read = root.querySelector<HTMLInputElement>("[data-hologram-read]")!;
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const controller = new AbortController();
  const signal = controller.signal;
  let state: State = "idle";
  let disposed = false;
  let recognition: Recognition | undefined;
  let utterance: SpeechSynthesisUtterance | undefined;
  let renderOnce = () => {};
  const labels: Record<State, string> = {
    idle: "À votre rythme",
    thinking: "Réflexion en cours",
    speaking: "Lecture de la réponse",
    listening: "Je vous écoute",
    error: "Connexion à vérifier",
  };
  const setState = (next: State) => {
    state = next;
    root.dataset.state = next;
    label.textContent = labels[next];
    renderOnce();
  };
  const stopVoice = () => {
    recognition?.abort();
    recognition = undefined;
    if (utterance) {
      utterance.onend = null;
      utterance.onerror = null;
      window.speechSynthesis?.cancel();
      utterance = undefined;
    }
    stop.disabled = true;
    speak.disabled = !RecognitionClass;
    if (state === "speaking" || state === "listening") setState("idle");
  };
  const speechWindow = window as unknown as {
    SpeechRecognition?: new () => Recognition;
    webkitSpeechRecognition?: new () => Recognition;
  };
  const RecognitionClass =
    speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
  if (!RecognitionClass) {
    speak.disabled = true;
    status.textContent =
      "La saisie vocale n’est pas disponible ici. Ouvrez Conversation pour écrire.";
  }
  if (!("speechSynthesis" in window)) {
    read.disabled = true;
    read.title = "La lecture vocale n’est pas disponible dans ce navigateur.";
  }
  speak.addEventListener(
    "click",
    () => {
      if (!RecognitionClass) return;
      const question = document.querySelector<HTMLTextAreaElement>(
        "#companion-question",
      );
      if (!question) {
        status.textContent = "Ouvrez Conversation pour saisir votre question.";
        return;
      }
      stopVoice();
      const session = new RecognitionClass();
      recognition = session;
      session.lang = navigator.language || "en-US";
      session.continuous = false;
      session.interimResults = false;
      session.onresult = (event) => {
        if (recognition !== session) return;
        const transcript = Array.from(event.results)
          .map((result) => result[0]?.transcript ?? "")
          .join(" ")
          .trim();
        if (transcript) {
          document.dispatchEvent(new CustomEvent('orbit:open-conversation'));
          question.value = transcript.slice(
            0,
            question.maxLength > 0 ? question.maxLength : 2000,
          );
          question.dispatchEvent(new Event("input", { bubbles: true }));
          question.focus();
          status.textContent =
            "Question transcrite. Relisez-la, puis choisissez Envoyer.";
        }
      };
      session.onerror = (event) => {
        status.textContent =
          event.error === "not-allowed"
            ? "Microphone non autorisé. Vous pouvez écrire votre question."
            : "Aucune transcription obtenue. Réessayez ou écrivez votre question.";
      };
      session.onend = () => {
        if (recognition === session) {
          recognition = undefined;
          stop.disabled = true;
          speak.disabled = false;
          if (state === "listening") setState("idle");
        }
      };
      try {
        session.start();
        speak.disabled = true;
        stop.disabled = false;
        status.textContent = "Je vous écoute. Arrêter coupe la saisie vocale.";
        setState("listening");
      } catch {
        recognition = undefined;
        status.textContent =
          "La saisie vocale n’a pas démarré. Vous pouvez écrire votre question.";
      }
    },
    { signal },
  );
  stop.addEventListener(
    "click",
    () => {
      stopVoice();
      status.textContent = "Voix arrêtée.";
    },
    { signal },
  );
  // A deliberate tap activates voice. Any drag permanently cancels that gesture.
  // Keep this interaction in the full application, not the future side panel.
  if(document.body.classList.contains('app-page')){
    let pressed:{x:number;y:number;at:number;moved:boolean}|undefined;
    canvas.setAttribute('role','button');
    canvas.setAttribute('aria-label','Orbit. Cliquez ou appuyez sur Entrée pour parler. Glissez pour déplacer. Maj et glisser pour tourner. E disperse, R recentre.');
    canvas.addEventListener('pointerdown',event=>{if(event.button===0)pressed={x:event.clientX,y:event.clientY,at:performance.now(),moved:event.shiftKey}},{signal});
    canvas.addEventListener('pointermove',event=>{if(pressed&&Math.hypot(event.clientX-pressed.x,event.clientY-pressed.y)>=7)pressed.moved=true},{signal});
    canvas.addEventListener('pointerup',event=>{
      if(pressed&&!pressed.moved&&performance.now()-pressed.at<500&&Math.hypot(event.clientX-pressed.x,event.clientY-pressed.y)<7&&presence.containsSurfacePoint(event.clientX,event.clientY)){
        if(state==='listening')stop.click();else speak.click();
      }
      pressed=undefined;
    },{signal});
    canvas.addEventListener('pointercancel',()=>{pressed=undefined},{signal});
    canvas.addEventListener('keydown',event=>{
      if(event.key==='Enter'){event.preventDefault();if(state==='listening')stop.click();else speak.click();}
    },{signal});
  }
  read.addEventListener(
    "change",
    () => {
      if (!read.checked) stopVoice();
    },
    { signal },
  );
  document.addEventListener(
    "orbit:companion-state",
    (event) => {
      const detail = (event as CustomEvent<{ state: State; text?: string }>)
        .detail;
      if (!detail || !(detail.state in labels)) return;
      stopVoice();
      if (detail.state !== "speaking") {
        setState(detail.state);
        return;
      }
      if (
        !read.checked ||
        !detail.text?.trim() ||
        !("speechSynthesis" in window)
      ) {
        setState("idle");
        return;
      }
      const speech = new SpeechSynthesisUtterance(detail.text);
      utterance = speech;
      speech.lang = navigator.language || "en-US";
      speech.rate = 0.98;
      speech.onstart = () => setState("speaking");
      speech.onend = () => {
        if (utterance === speech) {
          utterance = undefined;
          stop.disabled = true;
          setState("idle");
        }
      };
      speech.onerror = () => {
        if (utterance === speech) {
          utterance = undefined;
          stop.disabled = true;
          setState("idle");
          status.textContent =
            "La lecture vocale s’est interrompue. Le texte reste dans la conversation.";
        }
      };
      stop.disabled = false;
      window.speechSynthesis.speak(speech);
    },
    { signal },
  );

  let projectedX = -1, projectedY = -1;
  const presence = mountPresence(
    canvas,
    {
      modelUrl: "/presence-review/orbit-study.glb",
      animations: {
        idle: "Idle",
        listening: "Listening",
        thinking: "Thinking",
        speaking: "Speaking",
      },
    },
    {
      quality: document.body.classList.contains("panel-page") ? "low" : "high",
      appearance: document.body.classList.contains('app-page') ? 'particles' : 'solid',
      onProjection(x,y) {
        root.style.setProperty('--presence-x',`${x}%`);
        root.style.setProperty('--presence-y',`${y}%`);
        if (Math.abs(x-projectedX)+Math.abs(y-projectedY) > .15) {
          projectedX=x; projectedY=y;
          document.dispatchEvent(new CustomEvent('orbit:presence-position'));
        }
      },
      onStatus(value, message) {
        fallback.hidden = value === "ready";
        canvas.hidden = value === "unavailable";
        if (value !== "ready") label.textContent = message;
        else label.textContent = labels[state];
      },
    },
  );
  renderOnce = () => presence.setActivity(state);
  root.querySelector('[data-presence-scatter]')?.addEventListener('click',()=>{
    presence.scatter();
    const button=root.querySelector<HTMLButtonElement>('[data-presence-solid]');
    if(button){button.setAttribute('aria-pressed','false');button.textContent='Matière';}
  },{signal});
  root.querySelector('[data-presence-reset]')?.addEventListener('click',()=>presence.reset(),{signal});
  root.querySelector('[data-presence-solid]')?.addEventListener('click',event=>{
    const button=event.currentTarget as HTMLButtonElement;
    const solid=canvas.dataset.appearance!=='solid';
    presence.setAppearance(solid?'solid':'particles');
    button.setAttribute('aria-pressed',String(solid));
    button.textContent=solid?'Particules':'Matière';
  },{signal});
  root.querySelector('[data-presence-conversation]')?.addEventListener('click',()=>document.dispatchEvent(new CustomEvent('orbit:open-conversation')),{signal});
  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.hidden) stopVoice();
    },
    { signal },
  );
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    stopVoice();
    controller.abort();
    presence.dispose();
    renderOnce = () => {};
  };
  document.addEventListener("orbit:logout", () => stopVoice(), { signal });
  document.addEventListener("orbit:session-expired", () => stopVoice(), {
    signal,
  });
  window.addEventListener(
    "pagehide",
    (event) => {
      if (event.persisted) stopVoice();
      else dispose();
    },
    { signal },
  );
  document.addEventListener("astro:before-swap", dispose, {
    once: true,
    signal,
  });
  return dispose;
}

import type { Evidence } from "../../../packages/evidence-review/src/index";

const scope = "https://www.googleapis.com/auth/drive.file";
const supported = [
  "application/vnd.google-apps.document",
  "text/plain",
  "text/markdown",
];
type Config = {
  configured: boolean;
  clientId: string;
  appId: string;
  developerKey: string;
};
type Selection = { id: string; name: string; mimeType: string };
let accessToken = "",
  importing = false;
let sdk: Promise<void> | undefined;

export async function driveConfiguration(): Promise<Config> {
  const response = await fetch("/integrations/google-drive.json", {
    cache: "no-store",
  });
  if (!response.ok) throw Error("Configuration Drive indisponible.");
  const config = await response.json();
  if (
    !config.configured ||
    !/\.apps\.googleusercontent\.com$/.test(config.clientId ?? "") ||
    !/^\d+$/.test(config.appId ?? "") ||
    !config.developerKey
  )
    throw Error(
      "Connexion Drive à configurer : client OAuth Web, numéro du projet et clé Google Picker restreinte. Aucune connexion Google n’a été lancée.",
    );
  return config;
}
function load(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      script.remove();
      reject(
        Error(
          "Chargement Google bloqué. Vérifiez le réseau et les autorisations du site.",
        ),
      );
    };
    document.head.append(script);
  });
}
export function disconnectDrive(): Promise<void> {
  const token = accessToken;
  accessToken = "";
  if (!token) return Promise.resolve();
  return new Promise((resolve, reject) =>
    (window as any).google.accounts.oauth2.revoke(token, (result: any) =>
      result?.successful === false
        ? reject(
            Error(
              "Déconnexion locale effectuée ; révocation Google à vérifier dans votre compte.",
            ),
          )
        : resolve(),
    ),
  );
}
export const driveConnected = () => !!accessToken;

/** The token stays in memory. Only selected IDs, not the user's file list, are requested. */
export async function readSelectedDriveFile(
  file: Selection,
  token: string,
  signal?: AbortSignal,
): Promise<Evidence> {
  if (
    !/^[a-zA-Z0-9_-]{1,200}$/.test(file.id) ||
    !supported.includes(file.mimeType)
  )
    throw Error("Choisissez un Google Doc ou un fichier texte/Markdown.");
  const path = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}`;
  const url =
    file.mimeType === "application/vnd.google-apps.document"
      ? `${path}/export?mimeType=text%2Fplain`
      : `${path}?alt=media`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
    redirect: "error",
    cache: "no-store",
  });
  if (!response.ok)
    throw Error(
      response.status === 401
        ? "Autorisation Drive expirée : reconnectez-vous."
        : "Ce fichier sélectionné ne peut pas être lu avec cette autorisation.",
    );
  const reader = response.body?.getReader();
  if (!reader) throw Error("Document vide ou téléchargement indisponible.");
  let bytes = 0,
    text = "";
  const decoder = new TextDecoder();
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.length;
      if (bytes > 2_000_000)
        throw Error(
          "Fichier trop volumineux pour cet import (2 Mo). Aucun extrait ajouté.",
        );
      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
  } finally {
    await reader.cancel();
    reader.releaseLock();
  }
  if (!text.trim())
    throw Error("Le document ne contient pas de texte exploitable.");
  return {
    id: `drive_${file.id}`,
    title: file.name.slice(0, 500),
    url: `https://drive.google.com/file/d/${file.id}/view`,
    status: "excerpt-read",
    text: text.slice(0, 12000),
    publisher: "Document Drive choisi par l’utilisateur",
    retrievedAt: new Date().toISOString(),
  };
}

/** Preparation precedes the separate click that triggers Google's account/consent popup. */
export async function prepareDrivePicker(
  onFile: (file: Evidence) => void,
  onError: (error: Error) => void,
): Promise<() => void> {
  const config = await driveConfiguration();
  sdk ??= Promise.all([
    load("https://accounts.google.com/gsi/client"),
    load("https://apis.google.com/js/api.js"),
  ])
    .then(
      () =>
        new Promise<void>((resolve, reject) =>
          (window as any).gapi.load("picker", {
            callback: resolve,
            onerror: () => reject(Error("Google Picker indisponible.")),
          }),
        ),
    )
    .catch((error) => {
      sdk = undefined;
      throw error;
    });
  await sdk;
  const google = (window as any).google;
  function showPicker() {
    const picker = new google.picker.PickerBuilder()
      .setDeveloperKey(config.developerKey)
      .setAppId(config.appId)
      .setOAuthToken(accessToken)
      .setOrigin(location.origin)
      .addView(new google.picker.DocsView().setMimeTypes(supported.join(",")))
      .setCallback(async (data: any) => {
        if (data.action === google.picker.Action.CANCEL) {
          picker.dispose();
          return;
        }
        if (data.action !== google.picker.Action.PICKED || importing) return;
        importing = true;
        const token = accessToken;
        try {
          const selected = data.docs?.[0];
          if (!selected) throw Error("Aucun fichier sélectionné.");
          const record = await readSelectedDriveFile(
            selected,
            token,
            AbortSignal.timeout(30000),
          );
          if (accessToken !== token)
            throw Error("Accès Drive révoqué pendant la lecture.");
          onFile(record);
        } catch (error) {
          onError(
            error instanceof Error ? error : Error("Import Drive interrompu."),
          );
        } finally {
          importing = false;
          picker.dispose();
        }
      })
      .build();
    picker.setVisible(true);
  }
  const client = google.accounts.oauth2.initTokenClient({
    client_id: config.clientId,
    scope,
    include_granted_scopes: false,
    callback: (response: any) => {
      if (
        response.error ||
        !google.accounts.oauth2.hasGrantedAllScopes(response, scope)
      ) {
        onError(Error("Autorisation Google refusée ou incomplète."));
        return;
      }
      accessToken = response.access_token;
      showPicker();
    },
    error_callback: () =>
      onError(
        Error("Fenêtre Google fermée ou bloquée. Vous pouvez réessayer."),
      ),
  });
  return () =>
    client.requestAccessToken({ prompt: accessToken ? "" : "consent" });
}

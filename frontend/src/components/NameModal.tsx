"use client";

import { useEffect, useRef, useState } from "react";

interface PendingRequest {
  resolve: (name: string | null) => void;
  title: string;
  blurb: string;
  confirmLabel: string;
}

/**
 * Themed in-character name entry, replacing the browser's native prompt().
 * Mount <NameModalHost /> once; imperative game code calls `promptName()`:
 *
 *   const name = await promptName();            // default wording
 *   const name = await promptName({ title });   // custom wording
 *
 * Resolves null when the player cancels.
 */

const DEFAULTS = {
  title: "Sign the Ledger",
  blurb: "Every name in this book is a soul the dark can count. Speak yours.",
  confirmLabel: "Enter the Nightmare",
};

export function promptName(options?: Partial<typeof DEFAULTS>): Promise<string | null> {
  return new Promise((resolve) => {
    window.dispatchEvent(
      new CustomEvent("frightfate-name-prompt", {
        detail: { ...DEFAULTS, ...options, resolve },
      })
    );
  });
}

export function NameModalHost() {
  const [request, setRequest] = useState<PendingRequest | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef<PendingRequest | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as PendingRequest;
      requestRef.current = detail;
      setRequest(detail);
    };
    window.addEventListener("frightfate-name-prompt", handler);
    return () => window.removeEventListener("frightfate-name-prompt", handler);
  }, []);

  useEffect(() => {
    if (request && inputRef.current) {
      inputRef.current.value = "";
      inputRef.current.focus();
    }
  }, [request]);

  if (!request) return null;

  const settle = (name: string | null) => {
    requestRef.current?.resolve(name);
    requestRef.current = null;
    setRequest(null);
  };

  const submit = () => {
    const value = inputRef.current?.value.trim() || "";
    if (!value) {
      inputRef.current?.focus();
      return;
    }
    settle(value);
  };

  return (
    <div className="modal-veil" id="nameModal" role="dialog" aria-modal="true" aria-label={request.title}>
      <div className="modal-card panel-brackets">
        <h3 className="modal-title">{request.title}</h3>
        <p className="modal-blurb">{request.blurb}</p>
        <input
          ref={inputRef}
          type="text"
          id="modalNameInput"
          className="modal-input"
          maxLength={20}
          placeholder="Write your name…"
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") settle(null);
          }}
        />
        <div className="modal-controls">
          <button className="btn" id="modalConfirmBtn" onClick={submit}>
            {request.confirmLabel}
          </button>
          <button className="btn btn-secondary" id="modalCancelBtn" onClick={() => settle(null)}>
            Step Back
          </button>
        </div>
      </div>
    </div>
  );
}

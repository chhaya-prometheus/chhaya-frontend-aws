import { useState } from "react";

export default function CopyLink() {
    const [copied, setCopied] = useState(false);

    async function copy() {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        } catch {
            window.prompt("Copy this link", window.location.href);
        }
    }

    return (
        <button type="button" onClick={copy} className="text-sm font-medium text-accent hover:underline">
            {copied ? "Link copied" : "Copy link"}
        </button>
    );
}

# KD Pixel Panel (VS Code Family)

Native KD observer panel that renders a pixel world from project events:

- Event stream: `.kracked/runtime/events.jsonl`
- Asset source: `Assets.zip` (or split parts in `asset-pack/`)

This panel now runs the KD RPG world renderer and rebuilds its visual bundle from your asset pack.

## Local Build / Package

```bash
cd ide/vscode-kd-pixel-panel
node build-assets-from-zip.js --workspace ../..
npx @vscode/vsce package
```

Install VSIX:

```bash
code --install-extension kd-pixel-panel-0.4.2.vsix --force
```

## Open Panel

- Panel container: `KD Pixel`
- View: `Pixel Observer`
- Command fallback: `KD Pixel: Show Panel`

## Notes

- Observer mode only (driven by KD events).
- Main agent + professional agents are rendered from event activity/delegation.
- Web mirror and native panel share the same frontend bundle.

## Attribution

Visual assets are loaded from user-provided pack during build.
See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

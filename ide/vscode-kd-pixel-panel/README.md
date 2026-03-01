# KD Pixel Panel (VS Code Family)

Native IDE panel that reads KD event stream from:

- `.kracked/runtime/events.jsonl`

This panel now uses the **upstream pixel-agents webview bundle style** (office map, sprites, edit mode UI) and maps KD events into that runtime.

## Install Extension (Local)

```bash
cd ide/vscode-kd-pixel-panel
npx @vscode/vsce package
```

Install:

```bash
code --install-extension kd-pixel-panel-0.3.3.vsix
```

## Open Panel

- Panel container: `KD Pixel`
- View: `Pixel Observer`
- Command fallback: `KD Pixel: Show Panel`
- Reset command: `KD Pixel: Reset Office Layout`

## Notes

- KD runs this panel in **observer mode** (event-driven visualization).
- Agent movement/status is derived from KD event stream.
- Layout save/import/export is supported in panel UI.

## Attribution

Bundled UI style is derived from:

- https://github.com/pablodelucca/pixel-agents (MIT)

See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

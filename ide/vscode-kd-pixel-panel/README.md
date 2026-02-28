# KD Pixel Panel (VS Code Family)

Native IDE panel that reads KD event stream from:

- `.kracked/runtime/events.jsonl`

This panel runs an animated pixel office scene:

- each active agent appears as a character
- characters walk between desk/reading/waiting zones
- state reacts to actions from KD event stream

## Install Extension (Local)

```bash
cd ide/vscode-kd-pixel-panel
npx @vscode/vsce package
```

This generates `kd-pixel-panel-0.1.0.vsix`.

Install in VS Code:

```bash
code --install-extension kd-pixel-panel-0.1.0.vsix
```

## Open Panel

This extension now appears as a native panel container (similar behavior to Pixel Agents):

- Panel area icon/title: `KD Pixel`
- View name: `Pixel Observer`

Command Palette fallback:

- `KD Pixel: Show Panel`

## Data Source

The panel is read-only observer. It does not modify agent behavior.

Generate sample event:

```bash
node .kracked/runtime/emit-event.js --source antigravity --agent-id main-agent --agent-name Moon --role "Master Agent" --action typing --task kd-analyze
```

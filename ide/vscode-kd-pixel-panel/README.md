# KD Pixel Panel (VS Code Family)

Native IDE panel that reads KD event stream from:

- `.kracked/runtime/events.jsonl`

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

Command Palette:

- `KD: Open Pixel Observer Panel`

## Data Source

The panel is read-only observer. It does not modify agent behavior.

Generate sample event:

```bash
node .kracked/runtime/emit-event.js --source antigravity --agent-id main-agent --agent-name Moon --role "Master Agent" --action typing --task kd-analyze
```

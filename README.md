# myDealz Filter

Version: 1.0.1

myDealz Filter hides unwanted deals on `mydealz.de` based on your keywords.

## What it does

- Hides deals by title keywords
- Supports exception keywords
- Shows hidden deals in the popup
- Shows the number of hidden deals in the badge

## Privacy

- No data collection
- No data transfer to external servers
- Settings stay in your browser

## Browser Targets

- Current release target: Firefox (`manifest.json`)
- Planned future target: Chrome (`manifest.chrome.json`)

### Porting Workflow (Chrome)

1. Use this Firefox repo as the source of truth for shared code (`src/`, `icons/`).
2. In the Chrome project, use `manifest.chrome.json` as the base manifest content.
3. Keep the key manifest difference: Firefox uses `background.scripts` plus `browser_specific_settings`, while Chrome uses `background.service_worker` and no `browser_specific_settings`.
4. Run Chrome-specific packaging/linting in the Chrome repo.

## Support

- GitHub: https://github.com/codingismynewgaming
- Buy me a coffee: https://buymeacoffee.com/codingiymynewgaming
- PayPal: https://www.paypal.com/donate/?hosted_button_id=ZXHJFTUW9NQK8

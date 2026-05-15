# changebot-panel



<!-- Auto Generated Below -->


## Properties

| Property  | Attribute | Description                                                                                                                                                                            | Type                                                                                                                                                                                                                                                                                   | Default          |
| --------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| `dark`    | `dark`    |                                                                                                                                                                                        | `"catppuccin-frappe" \| "catppuccin-latte" \| "catppuccin-macchiato" \| "catppuccin-mocha" \| "cyberpunk" \| "dracula" \| "everforest-dark" \| "everforest-light" \| "frost" \| "gruvbox-dark" \| "gruvbox-light" \| "nord" \| "solarized-dark" \| "solarized-light" \| "tokyo-night"` | `undefined`      |
| `light`   | `light`   |                                                                                                                                                                                        | `"catppuccin-frappe" \| "catppuccin-latte" \| "catppuccin-macchiato" \| "catppuccin-mocha" \| "cyberpunk" \| "dracula" \| "everforest-dark" \| "everforest-light" \| "frost" \| "gruvbox-dark" \| "gruvbox-light" \| "nord" \| "solarized-dark" \| "solarized-light" \| "tokyo-night"` | `undefined`      |
| `mode`    | `mode`    |                                                                                                                                                                                        | `"drawer-left" \| "drawer-right" \| "modal"`                                                                                                                                                                                                                                           | `'drawer-right'` |
| `scope`   | `scope`   |                                                                                                                                                                                        | `string`                                                                                                                                                                                                                                                                               | `undefined`      |
| `theme`   | `theme`   |                                                                                                                                                                                        | `"catppuccin-frappe" \| "catppuccin-latte" \| "catppuccin-macchiato" \| "catppuccin-mocha" \| "cyberpunk" \| "dracula" \| "everforest-dark" \| "everforest-light" \| "frost" \| "gruvbox-dark" \| "gruvbox-light" \| "nord" \| "solarized-dark" \| "solarized-light" \| "tokyo-night"` | `undefined`      |
| `trigger` | `trigger` | CSS selector for elements that should open the panel when clicked. Uses event delegation on the document, so elements added after mount also work. Example: `trigger=".open-updates"`. | `string`                                                                                                                                                                                                                                                                               | `undefined`      |


## Methods

### `close() => Promise<void>`



#### Returns

Type: `Promise<void>`



### `open() => Promise<void>`



#### Returns

Type: `Promise<void>`



### `setUpdates(updates: Update[]) => Promise<void>`



#### Parameters

| Name      | Type       | Description |
| --------- | ---------- | ----------- |
| `updates` | `Update[]` |             |

#### Returns

Type: `Promise<void>`




----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*

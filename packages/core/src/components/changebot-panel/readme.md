# changebot-panel



<!-- Auto Generated Below -->


## Properties

| Property | Attribute | Description | Type                                                                                                                                                                                                                                                                                   | Default          |
| -------- | --------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| `dark`   | `dark`    |             | `"catppuccin-frappe" \| "catppuccin-latte" \| "catppuccin-macchiato" \| "catppuccin-mocha" \| "cyberpunk" \| "dracula" \| "everforest-dark" \| "everforest-light" \| "frost" \| "gruvbox-dark" \| "gruvbox-light" \| "nord" \| "solarized-dark" \| "solarized-light" \| "tokyo-night"` | `undefined`      |
| `light`  | `light`   |             | `"catppuccin-frappe" \| "catppuccin-latte" \| "catppuccin-macchiato" \| "catppuccin-mocha" \| "cyberpunk" \| "dracula" \| "everforest-dark" \| "everforest-light" \| "frost" \| "gruvbox-dark" \| "gruvbox-light" \| "nord" \| "solarized-dark" \| "solarized-light" \| "tokyo-night"` | `undefined`      |
| `mode`   | `mode`    |             | `"drawer-left" \| "drawer-right" \| "modal"`                                                                                                                                                                                                                                           | `'drawer-right'` |
| `scope`  | `scope`   |             | `string`                                                                                                                                                                                                                                                                               | `undefined`      |
| `theme`  | `theme`   |             | `"catppuccin-frappe" \| "catppuccin-latte" \| "catppuccin-macchiato" \| "catppuccin-mocha" \| "cyberpunk" \| "dracula" \| "everforest-dark" \| "everforest-light" \| "frost" \| "gruvbox-dark" \| "gruvbox-light" \| "nord" \| "solarized-dark" \| "solarized-light" \| "tokyo-night"` | `undefined`      |


## Events

| Event                   | Description | Type                              |
| ----------------------- | ----------- | --------------------------------- |
| `changebot-last-viewed` |             | `CustomEvent<{ scope: string; }>` |


## Methods

### `close() => Promise<void>`

Close the panel

#### Returns

Type: `Promise<void>`



### `open() => Promise<void>`

Open the panel

#### Returns

Type: `Promise<void>`



### `setUpdates(updates: Update[]) => Promise<void>`

Set the updates to display

#### Parameters

| Name      | Type       | Description |
| --------- | ---------- | ----------- |
| `updates` | `Update[]` |             |

#### Returns

Type: `Promise<void>`




----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*

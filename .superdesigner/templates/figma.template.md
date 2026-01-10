# Figma Links

Paste your Figma links below. Select an artboard that includes your flows. The link should include `node-id`.

## Flows

Flow 1 - (paste your Figma URL here)

Flow 2 - (optional)

Flow 3 - (optional)

---

## For Superdesigner Agent

When reviewing:
1. Only process lines that contain valid Figma URLs (contain `figma.com/design/`)
2. Skip lines with placeholder text like "(paste", "(optional)", "FILE_KEY", or "XXX-YYY"
3. Extract `fileKey` from URL (e.g., `rJc2p0HqHTuPuA214jJ0WV`)
4. Extract `nodeId` from `node-id=` param (e.g., `424-51708` → use as `424:51708`)
5. Call `mcp_Figma_get_metadata` with fileKey and nodeId to get nested screens
6. Use nested screen nodeIds for pinning comments (not parent frame nodeIds)

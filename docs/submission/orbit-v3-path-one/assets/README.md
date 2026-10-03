# Editable article illustrations

Each directory contains an editable Graphviz `source.dot`, an accessible SVG, a PNG export, bilingual caption and alternative text, and a package manifest with file identities and provenance.

- [Evolution](evolution/diagram.svg): retained research work, a reviewable evidence dossier and its later educational use.
- [Reading and proposal authority](authority-flow/diagram.svg): person, assistant, bounded tools, public Context and human review.

Graphviz **15.1.0** produced the exports. Source-backed diagrams are editorial explanations of architecture and history; they do not represent successful model-campaign results.

## Regeneration

From this package's `assets` directory, run Graphviz against the selected source:

```powershell
dot -Tsvg './evolution/source.dot' -o './evolution/diagram.svg'
dot -Tpng './evolution/source.dot' -o './evolution/diagram.png'
```

Use the same commands with `authority-flow` to render the second diagram. After regeneration, restore the SVG's descriptive `<title>` and `<desc>` and its `role="img"` / `aria-labelledby` attributes from the package's alternative text. Update manifest hashes and repeat visual and structural inspection. A modified source invalidates the old render identities.

The article embeds GitHub raw SVG URLs after the package is pushed. Retain the adjacent caption and Markdown alternative text. PNG exports provide a fallback for services that require raster media. The [capture checklist](../demo-capture-checklist.md) governs application screenshots and the author's separate NotebookLM asset.

# Red Hat Diagrams in SVG

This repo is to facilitate collaboration on diagram content via git, and to create production ready SVG's.

SVG's should be saved from Illustrator using the following steps:

1. Save out SVG by going to File > Export > Export for Screens
2. Make sure it's exporting an SVG in the right column
3. Go to the Export Settings by clicking on the gear above the export types
  ![Click the gear icon in the right column next to the export filetypes](docs/images/export-settings.png)
4. Click SVG in the left column, then reproduce these settings:
  ![Styling: Internal CSS, Font: Convert to Outlines, Images: Linked, Object ID's: Unique, Decimal 3, Leave minify and responsive unchecked](docs/images/svg-settings.png)
5. Save Settings and Export `@todo filenaming convention?`
6. Repeat steps 1 - 5, but this time in the Export settings set "Font" to "SVG" `@todo filenaming convention`
7. For a new diagram create a new folder in this project under `source/` `@todo folder naming convention`
8. Create a `data.yml` file and add the follow text, feel free to add any information you know:
```yml
name:
alt_text:
related_products:
```
9. `@todo` Run build process and commit...
10. Push up result

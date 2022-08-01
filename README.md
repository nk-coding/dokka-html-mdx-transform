# dokka-html-mdx-transform

- Action to transform the output of dokkaHtml to a mdx format, typically used in combination  with Docusaurus.
- Typically, you should use `dest` as a path to your docs folder, and `folder` as name for the folder that should be generated within the docs folder (`folder` is added to all the ids).
- This also generates a JSON which can be imported for the sidebar.
-  It is recommended to use the branch for your dokka version (e.g. if you use 1.6.20, you should use branch 1_6_20).
- This requires the [raw-loder](https://www.npmjs.com/package/raw-loader) npm module.
- Caution: this does not handle the necessaray csv and js files, it just transforms the generated html files.

## Inputs

## `src`

**Required** The path of the packages output of dokkaHTML, typically something like build/dokka/html

## `modules`

**Required** The modules in `src` which should be added to the documentation

## `dest`

**Required** The path where to copy the generated files

## `folder`

**Required** Name of the folder in dest which is created to store the output

## `dokka-component-path`

**Required** Path to a react component which is used as wrapper, should export default the component. Default `"/src/components/DokkaComponent/DokkaComponent.js"`

## Example usage

```yml
uses: nk-coding/dokka-html-mdx-transform@1_6_20
with:
  src: "build/dokka/html/my-library"
  dest: "website/docs"
  folder: "dokka"
  overview-id: "overview"
```
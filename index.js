const path = require('path');
const fs = require('fs-extra')
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const core = require('@actions/core');

try {

    const src = core.getInput("src")
    const dest = core.getInput("dest")
    const folder = core.getInput("folder")

    function transformFile(file) {
        const content = fs.readFileSync(file)
        const dom = new JSDOM(content).window.document
        const mainContent = dom.getElementById("content")
        const breadcrums = mainContent.querySelector(".breadcrumbs")
        mainContent.removeChild(breadcrums)
        const cover = mainContent.querySelector(".cover")
        const coverHeader = cover.querySelector(".cover")
        cover.removeChild(coverHeader)
        const name = coverHeader.textContent
        for (a of mainContent.querySelectorAll("a")) {
            const href = a.getAttribute("href")
            if (href && !href.startsWith("http")) {
                a.setAttribute("href", href.replace(/\.html/, "-"))
            }
        }
        const newString = mainContent.innerHTML
        const withoutEnding = path.basename(file).replace(".html", "-")
        const newHtmlPath = path.join(dest, folder, path.relative(src, path.dirname(file)), withoutEnding + ".raw")
        const newMdxPath = path.join(dest, folder, path.relative(src, path.dirname(file)), withoutEnding + ".mdx")
        fs.outputFileSync(newHtmlPath, newString)
        fs.outputFileSync(newMdxPath, `
import DokkaComponent from "${core.getInput("dokka-component-path")}"
import rawHTML from '!!raw-loader!./${withoutEnding}.raw'

# ${name}

<DokkaComponent dokkaHTML={rawHTML}/>
        `)
        return {
            type: "doc",
            id: path.join(folder, path.relative(src, path.dirname(file)), withoutEnding).replace(/\\/g, "/"),
            label: name
        }
    }

    function generateForDir(dir) {
        const subdirs = []
        const files = []
        let indexPath = null
        for (const subdir of fs.readdirSync(dir)) {
            const subdirPath = path.join(dir, subdir)
            if (fs.statSync(subdirPath).isDirectory()) {
                subdirs.push(subdirPath)
            } else {
                if (subdir == "index.html") {
                    indexPath = subdirPath
                } else {
                    files.push(subdirPath)
                }
            }
        }
        if (!indexPath) {
            throw "no index found: " + dir
        }
        const index = transformFile(indexPath)
        const items = [
            ...subdirs.map(subdir => generateForDir(subdir)),
            ...files.map(file => transformFile(file))
        ]
        return {
            type: "category",
            label: index.label,
            link: {
                type: "doc",
                id: index.id
            },
            items: items
        }
    }

    docs = [core.getInput("overview-id")]
    for (const package of fs.readdirSync(src)) {
        const packagePath = path.join(src, package)
        if (fs.statSync(packagePath).isDirectory()) {
            docs.push(generateForDir(packagePath))
        }
    }
    fs.outputFileSync(path.join(dest, folder, "sidebar.json"), JSON.stringify(docs))

} catch (error) {
    core.setFailed(error.message)
}
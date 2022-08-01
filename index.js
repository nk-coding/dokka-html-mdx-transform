const path = require('path');
const fs = require('fs-extra')
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const core = require('@actions/core');
core.message("started executing")
try {
    core.message("1")
    const src = core.getInput("src")
    const dest = core.getInput("dest")
    const folder = core.getInput("folder")
    const modules = core.getMultilineInput("modules")
    core.message("2")
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
    core.message("3")
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
    core.message("4")
    function generateModule(module) {
        const packageHierarchy = {}
        const packageMap = {}
        const modulePath = path.join(src, module)
        for (const package of fs.readdirSync(modulePath)) {
            const packagePath = path.join(modulePath, package)
            if (fs.statSync(packagePath).isDirectory()) {
                const generated = generateForDir(packagePath)
                generated.label = generated.label.replace("Package ", "")
                const packageStructure = generated.label.split(".")
                let currentMap = packageHierarchy
                for (const packagePart of packageStructure) {
                    if (currentMap[packagePart] == undefined) {
                        currentMap[packagePart] = {}
                    }
                    currentMap = currentMap[packagePart]
                }
                packageMap[generated.label] = generated
            }
        }
    }


    function joinParts(old, newPart) {
        if (old) {
            return `${old}.${newPart}`
        } else {
            return newPart
        }
    }

    function generateCategoriesRec(packageHierarchy, packageMap, localName, globalName) {
        const items = []
        let sidebarElement = null
        if (globalName in packageMap) {
            sidebarElement = packageMap[globalName]
            sidebarElement.label = localName
            sidebarElement.className = "sidebar-package-title"
            localName = ""
        }
        for (const newPart in packageHierarchy) {
            items.push(...generateCategoriesRec(packageHierarchy[newPart], packageMap, joinParts(localName, newPart), joinParts(globalName, newPart)))
        }
        if (sidebarElement != null) {
            sidebarElement.items = [...sidebarElement.items, ...items]
            return [sidebarElement]
        } else {
            return items
        }
    }
    core.message("5")
    const moduleCategories = []
    for (module of modules) {
        const [packageHierarchy, packageMap] = generateModule(module)
        const categories = generateCategoriesRec(packageHierarchy, packageMap, "", "")
        moduleCategories.push({
            type: "category",
            label: module,
            items: categories
        })
    }

    fs.outputFileSync(path.join(dest, folder, "sidebar.json"), JSON.stringify(moduleCategories))

} catch (error) {
    core.setFailed(error.message)
}
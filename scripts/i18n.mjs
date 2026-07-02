import fs from "fs"
import path from "path"

const root = "./src/lang"
const overridesRoot = "./src/lang-overrides"
const entry = "entry.ts"
const sourceLang = "en"
const sourceDir = path.join(root, sourceLang)
const langs = fs.readdirSync(root)

const isObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value)

const mergeMissing = (source, target) => {
  if (!isObject(source) || !isObject(target)) {
    return target === undefined ? source : target
  }
  const merged = { ...target }
  Object.entries(source).forEach(([key, value]) => {
    merged[key] =
      key in target ? mergeMissing(value, target[key]) : value
  })
  return merged
}

const mergeOverride = (target, override) => {
  if (!isObject(target) || !isObject(override)) {
    return override
  }
  const merged = { ...target }
  Object.entries(override).forEach(([key, value]) => {
    merged[key] =
      key in target ? mergeOverride(target[key], value) : value
  })
  return merged
}

const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"))

const writeJsonIfChanged = (file, data) => {
  const next = `${JSON.stringify(data, null, 2)}\n`
  const current = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : ""
  if (current !== next) {
    fs.writeFileSync(file, next)
  }
}

const jsonFiles = fs
  .readdirSync(sourceDir)
  .filter((file) => file.endsWith(".json"))

langs
  .filter((lang) => lang !== sourceLang)
  .forEach((lang) => {
    const langDir = path.join(root, lang)
    fs.copyFileSync(path.join(sourceDir, entry), path.join(langDir, entry))
    jsonFiles.forEach((file) => {
      const sourceFile = path.join(sourceDir, file)
      const targetFile = path.join(langDir, file)
      const overrideFile = path.join(overridesRoot, lang, file)
      let next = fs.existsSync(targetFile)
        ? mergeMissing(readJson(sourceFile), readJson(targetFile))
        : readJson(sourceFile)
      if (fs.existsSync(overrideFile)) {
        next = mergeOverride(next, readJson(overrideFile))
      }
      writeJsonIfChanged(targetFile, next)
    })
  })

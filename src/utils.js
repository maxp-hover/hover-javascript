const fs = require('fs')
const path = require('path')
const rimraf = require('rimraf')
const mkdirp = require('mkdirp')
const arrify = require('arrify')
const has = require('lodash.has')
const readPkgUp = require('read-pkg-up')
const which = require('which')
const {cosmiconfigSync} = require('cosmiconfig')

const {packageJson: pkg, path: pkgPath} = readPkgUp.sync({
  cwd: fs.realpathSync(process.cwd()),
})
const appDirectory = path.dirname(pkgPath)

function resolveHoverScripts() {
  if (pkg.name === '@hover/javascript') {
    return require.resolve('./').replace(process.cwd(), '.')
  }
  return resolveBin('hover-scripts')
}

// eslint-disable-next-line complexity
function resolveBin(modName, {executable = modName, cwd = process.cwd()} = {}) {
  let pathFromWhich
  try {
    pathFromWhich = fs.realpathSync(which.sync(executable))
    if (pathFromWhich && pathFromWhich.includes('.CMD')) return pathFromWhich
  } catch (_error) {
    // ignore _error
  }
  try {
    const {packageJson: binPackage, path: binPackagePath} = readPkgUp.sync({
      cwd: path.dirname(require.resolve(modName)),
    })

    const modPkgDir = path.dirname(binPackagePath)
    const {bin} = binPackage

    const binPath = typeof bin === 'string' ? bin : bin[executable]
    const fullPathToBin = path.join(modPkgDir, binPath)
    if (fullPathToBin === pathFromWhich) {
      return executable
    }
    return fullPathToBin.replace(cwd, '.')
  } catch (error) {
    if (pathFromWhich) {
      return executable
    }
    throw error
  }
}

const fromRoot = (...p) => path.join(appDirectory, ...p)
const hasFile = (...p) => fs.existsSync(fromRoot(...p))
const ifFile = (files, t, f) =>
  arrify(files).some(file => hasFile(file)) ? t : f

const getPkgName = () => pkg.name

const hasPkgProp = props => arrify(props).some(prop => has(pkg, prop))

const hasPkgSubProp = pkgProp => props =>
  hasPkgProp(arrify(props).map(p => `${pkgProp}.${p}`))

const ifPkgSubProp = pkgProp => (props, t, f) =>
  hasPkgSubProp(pkgProp)(props) ? t : f

const hasScript = hasPkgSubProp('scripts')
const hasPeerDep = hasPkgSubProp('peerDependencies')
const hasDep = hasPkgSubProp('dependencies')
const hasDevDep = hasPkgSubProp('devDependencies')
const hasAnyDep = args => [hasDep, hasDevDep, hasPeerDep].some(fn => fn(args))

const ifPeerDep = ifPkgSubProp('peerDependencies')
const ifDep = ifPkgSubProp('dependencies')
const ifDevDep = ifPkgSubProp('devDependencies')
const ifAnyDep = (deps, t, f) => (hasAnyDep(arrify(deps)) ? t : f)
const ifScript = ifPkgSubProp('scripts')

function parseEnv(name, def) {
  if (envIsSet(name)) {
    try {
      return JSON.parse(process.env[name])
    } catch (err) {
      return process.env[name]
    }
  }
  return def
}

function envIsSet(name) {
  return (
    process.env.hasOwnProperty(name) &&
    process.env[name] &&
    process.env[name] !== 'undefined'
  )
}

function getConcurrentlyArgs(scripts, {killOthers = true} = {}) {
  const colors = [
    'bgBlue',
    'bgGreen',
    'bgMagenta',
    'bgCyan',
    'bgWhite',
    'bgRed',
    'bgBlack',
    'bgYellow',
  ]
  scripts = Object.entries(scripts).reduce((all, [name, script]) => {
    if (script) {
      all[name] = script
    }
    return all
  }, {})
  const prefixColors = Object.keys(scripts)
    .reduce(
      (pColors, _s, i) =>
        pColors.concat([`${colors[i % colors.length]}.bold.reset`]),
      [],
    )
    .join(',')

  // prettier-ignore
  return [
    killOthers ? '--kill-others-on-fail' : null,
    '--prefix', '[{name}]',
    '--names', Object.keys(scripts).join(','),
    '--prefix-colors', prefixColors,
    ...Object.values(scripts).map(s => JSON.stringify(s)), // stringify escapes quotes ✨
  ].filter(Boolean)
}

function uniq(arr) {
  return Array.from(new Set(arr))
}

function writeExtraEntry(name, {cjs, esm}, clean = true) {
  if (clean) {
    rimraf.sync(fromRoot(name))
  }
  mkdirp.sync(fromRoot(name))

  const pkgJson = fromRoot(`${name}/package.json`)
  const entryDir = fromRoot(name)

  fs.writeFileSync(
    pkgJson,
    JSON.stringify(
      {
        main: path.relative(entryDir, cjs),
        'jsnext:main': path.relative(entryDir, esm),
        module: path.relative(entryDir, esm),
      },
      null,
      2,
    ),
  )
}

function hasLocalConfig(moduleName, searchOptions = {}) {
  const explorerSync = cosmiconfigSync(moduleName, searchOptions)
  const result = explorerSync.search(pkgPath)

  return result !== null
}

/**
 * Strip an argument and it's values from arguments forwarded to lint-staged
 *
 * @param {any[]} from arguments to strip argument(s) from, e.g: `process.argv`
 * @param {string[]} argument array of argument aliases, e.g: `['--foo-bar', '--fooBar']
 * @param {number} length number arguments to strip, i.e: `--arg value` = 2
 */
const stripArgument = (from, argument, length = 1) => {
  const index = from.findIndex(a => argument.includes(a))

  if (index < 0) return from

  const stripped = [...from]

  stripped.splice(index, length)

  return stripped
}

/**
 * Get function that converts relative paths to absolute
 *
 * @param {string} dirname `__dirname`
 */
const relative =
  dirname =>
  /**
   *
   * @param {string} p relative path
   */
  p =>
    path.join(dirname, p).replace(process.cwd(), '.')

module.exports = {
  appDirectory,
  fromRoot,
  getConcurrentlyArgs,
  getPkgName,
  hasAnyDep,
  hasFile,
  hasLocalConfig,
  hasPkgProp,
  hasScript,
  ifAnyDep,
  ifDep,
  ifDevDep,
  ifFile,
  ifPeerDep,
  ifScript,
  parseEnv,
  pkg,
  relative,
  resolveBin,
  resolveHoverScripts,
  stripArgument,
  uniq,
  writeExtraEntry,
}

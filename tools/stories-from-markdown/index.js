import findBefore from 'unist-util-find-before'
import htmlToReact from 'html-to-react'
import octicons from 'octicons'
import parents from 'unist-util-parents'
import parsePairs from 'parse-pairs'
import remark from 'remark'
import select from 'unist-util-select'

function railsOcticonToReact (html) {
  // <%= octicon "tools" %> to <svg class="octicon ...">...</svg>
  const octre = /<%= octicon[\(\s]["']([a-z\-]+)["'][^%]*%>/gi
  html = html.replace(octre, (match, name) => {
    return octicons[name].toSVG()
  })
  return html
}

function parseBlockAttrs(node, file) {
  const pairs = node.lang.replace(/^html\s*/, '')
  const attrs = pairs.length ? parsePairs(pairs) : {}
  attrs.title = attrs.title
    || getPreviousHeading(node)
    || `story @ ${file}:${node.position.start.line}`
  node.block = attrs
  return node
}

export function nodeToStory(node, file) {
  const html = railsOcticonToReact(node.value)
  const parser = new htmlToReact.Parser()
  const {title} = node.block
  return {
    title,
    story: () => parser.parse(html),
    html,
    file,
    node,
  }
}

function getPreviousHeading(node) {
  const heading = findBefore(node.parent, node, 'heading')
  return (heading && !heading.used)
    ? (heading.used = true, heading.children.map(c => c.value).join(''))
    : undefined
}

export default function storiesFromMarkdown(markdown, options) {
  const ast = parents(remark.parse(content, options))
  const path = file.replace(/^\.\//, '')
  return select(ast, 'code[lang^=html]')
    .map(parseBlockAttrs)
    .filter(node => node.block.story !== 'false')
    .map(node => nodeToStory(node, path))
}

export function requireContextHelper(req, options) {
  return req.keys()
    .filter(file => !file.match(/node_modules/))
    .reduce((stories, file) => {
      const content = req(file)
      const fileStories = storiesFromMarkdown(content, options)
      return stories.concat(fileStories)
    }, [])
}
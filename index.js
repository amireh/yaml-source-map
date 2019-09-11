const MAP_NODES = [ 'FLOW_MAP', 'MAP' ]
const SEQ_NODES = [ 'FLOW_SEQ', 'SEQ' ]
const INDEXABLE_NODES = [ 'DOCUMENT' ].concat(MAP_NODES).concat(SEQ_NODES)

class YAMLSourceMap {
  constructor() {
    // Map.<Object, { node: YAML.Node, filename: ?String }>
    this.nodes = new Map()
  }

  // (YAML.Node): Object
  //
  // reference: https://eemeli.org/yaml/#parsing-documents
  index(node, context = { filename: null }) {
    let document

    switch (node.type) {
      case 'DOCUMENT':
        document = this.index(node.contents, context)
        break;

      case 'FLOW_SEQ':
      case 'SEQ':
        document = node.items.map(childNode => this.index(childNode, context))
        break;

      case 'FLOW_MAP':
      case 'MAP':
        document = node.items.reduce((acc, pair) => {
          if (pair.value.type === 'ALIAS') {
            return Object.assign(acc, this.index(pair.value, context))
          }

          acc[pair.key] = this.index(pair.value, context)
          return acc
        }, {})
        break;

      case 'BLOCK_FOLDED':
      case 'BLOCK_LITERAL':
      case 'PLAIN':
      case 'QUOTE_DOUBLE':
      case 'QUOTE_SINGLE':
        document = node.toJSON()
        break;

      case 'COMMENT':
        break;

      case 'ALIAS':
        document = node.toJSON()
        break;

      default:
        throw new Error(`Not sure how to handle nodes of type "${node.type || '?'}"`)
    }

    // track arrays & objects so that we can resolve locations through them
    if (INDEXABLE_NODES.includes(node.type)) {
      this.nodes.set(document, { node, filename: context.filename })
    }

    return document
  }

  // (Object, Array.<String>): ?{ filename: ?String, line: Number }
  lookup(path, value) {
    const index = this.nodes.get(value)

    if (!index) {
      return null
    }

    const node = dig(path, index.node)

    if (!node) {
      return null
    }

    return createLocation(node, index.filename)
  }
}

// (Array.<String>, YAML.Node): ?YAML.Node
const dig = (path, node) => path.reduce((childNode, cursor) => {
  if (!childNode) {
    return undefined
  }
  else if (MAP_NODES.includes(childNode.type)) {
    const pair = childNode.items.find(x => x.key.value === cursor)

    if (pair) {
      return pair.value
    }
  }
  else if (SEQ_NODES.includes(childNode.type)) {
    return childNode.items[cursor]
  }
  else {
    return childNode.value
  }
}, contentsOf(node) /* see [1] in contentsOf */)

// YAML.Document seems to be a meta Node that has no location, so we need to get
// at its "contents" property to arrive at something that *does* have a location
//
// [1] reason we don't do it in dig's reducer is to handle the case of an empty
//     path and a YAML.Document for a value
const contentsOf = node => (
  node && node.type === 'DOCUMENT' ? node.contents : node
)

const createLocation = (node, filename) => node.cstNode ? (
  Object.assign({ filename, }, node.cstNode.rangeAsLinePos)
) : (
  undefined
)

module.exports = YAMLSourceMap

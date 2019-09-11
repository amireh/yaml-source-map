# YAMLSourceMap

A support library for resolving the YAML source location of objects parsed with
the Node.js [yaml] library.

Install along with [yaml]:

```bash
npm install --save yaml yaml-source-map
```

## Usage

Construct an instance of [`YAMLSourceMap`](./index.js) and feed it every
document you parse that you also want to look up later. Assume we have a YAML
blob like the following:

```yaml
---
# file: example.yml
a:
  b: 1
  # another comment
  c: 2
```

We would first pass it through [`YAML.parseDocument`][yaml-parse] and then
through our source map for indexing:

```javascript
const fs = require('fs')
const YAML = require('yaml')
const YAMLSourceMap = require('yaml-source-map')

const sourceMap = new YAMLSourceMap()
const document = sourceMap.index(
    YAML.parseDocument(
        fs.readFileSync('./example.yml', 'utf8'),
        { keepCstNodes: true /* must specify this */ }
    ),
    { filename: 'example.yml' /* optional */ }
)
// => { a: { b: 1, c: 2 } }
```

Now we're ready to look up documents:

```javascript
sourceMap.lookup([], document)
// => { filename: 'example.yml', line: 3 }

sourceMap.lookup([ 'a' ], document)
// => { filename: 'example.yml', line: 4 }

sourceMap.lookup([ 'a', 'b' ], document)
// => { filename: 'example.yml', line: 4 }

sourceMap.lookup([ 'a', 'c' ], document)
// => { filename: 'example.yml', line: 6 }

sourceMap.lookup([], document.a)
// => { filename: 'example.yml', line: 4 }
```

You can index as many documents as needed, which may come from different
source files (you'd use the `filename` option to keep track of that.)

## API

### `index(YAML.Document): Object`

Add a YAML document you [parsed previously][yaml-parse] to the source map. The
returned value is a _new_ and _serialized_ version of the document that can be
used in code and for lookups.

### `lookup(Array.<String>, Object): ?Location`

Look up the location of a document you previously indexed. A path may be
specified to resolve the location of a value found _inside_ the starting value
-- useful for scalars since they cannot be indexed in any meaningful way. Leave
it empty to resolve the location of the passed value.

`Location` is defined as:

```javascript
{
    filename: ?String,
    start: {
      line: Number,
      col: Number
    },
    end: {
      line: Number,
      col: Number
    }
}
```

## Limitations

The location reported for a map (a YAML dictionary) will be that of its first
property. Likewise for an array (a YAML list), the location will be that of its
first element. This is a limitation of the parser and the library does not work
around it.

For example, consider the YAML blob from the earlier usage example: the line
reported for `a` will actually be that for `a.b` -- line 4. This may be
counter-intuitive for humans but is usually not a big deal in practice.

## Changelog

### 2.1.0

Added support for more YAML types: flow maps and sequences, and aliases.

### 2.0.0

`lookup()` will now return all location information, not just line. To upgrade,
change all references to `lookup().line` to `lookup().start.line`.

[yaml]: https://github.com/eemeli/yaml
[yaml-parse]: https://eemeli.org/yaml/#parsing-documents
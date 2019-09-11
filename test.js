const YAML = require('yaml')
const YAMLSourceMap = require('./')
const { assert } = require('chai')
const dedent = require('dedent')

describe('YAMLSourceMap', function() {
  describe('lookup', () => {
    let document, sourceMap

    beforeEach(() => {
      sourceMap = new YAMLSourceMap()
      document = sourceMap.index(
        YAML.parseDocument(dedent`
          ---
          foo: "1"
          bar:
            baz:
              bax: 1
          arr:
            - a
            # teehee!
            - b
          literal: |
            hey!
          folded: >
            hey!
          flow_map: { a: 1, b: 2 }
        `, { keepCstNodes: true }), { filename: 'test.yml' }
      )
    })

    it('yields the location of a scalar found at the specified path inside a value', () => {
      assert.equal(sourceMap.lookup(['foo'], document).start.line, 2)
      assert.equal(sourceMap.lookup(['foo'], document).filename, 'test.yml')
      assert.equal(sourceMap.lookup(['bar', 'baz', 'bax'], document).start.line, 5)
    })

    it('yields the location of the value, given an empty path', () => {
      assert.equal(sourceMap.lookup([], document).start.line, 2)
    })

    it('yields the location of a complex object (Map) found at the specified path inside a value', () => {
      assert.equal(sourceMap.lookup(['bar'], document).start.line, 4)
      assert.equal(sourceMap.lookup(['bar', 'baz'], document).start.line, 5)

      assert.deepEqual(
        sourceMap.lookup(['bar', 'baz'], document),
        sourceMap.lookup(['baz'],        document.bar)
      )
    })

    it('yields the location of a complex object (FLOW_MAP) found at the specified path inside a value', () => {
      assert.equal(sourceMap.lookup(['flow_map'], document).start.line, 14)
      assert.equal(sourceMap.lookup(['flow_map', 'a'], document).start.line, 14)
    })

    it('yields the location of a complex object (Seq) found at the specified path inside a value', () => {
      assert.equal(sourceMap.lookup(['arr'], document).start.line, 7)
      assert.equal(sourceMap.lookup(['arr', 0], document).start.line, 7)
      assert.equal(sourceMap.lookup(['arr', 1], document).start.line, 9)

      assert.deepEqual(
        sourceMap.lookup(['arr', 0], document),
        sourceMap.lookup([0],        document.arr)
      )

      assert.deepEqual(
        sourceMap.lookup(['arr', 1], document),
        sourceMap.lookup([1],        document.arr)
      )
    })

    it('yields nothing for paths that yield no value', () => {
      assert.equal(sourceMap.lookup(['nope'], document), null)
      assert.equal(sourceMap.lookup(['nope', 'never'], document), null)
      assert.equal(sourceMap.lookup(['bar', 'baz', 'bax', 'lolol'], document), null)
    })

    it('yields nothing for scalar Documents', () => {
      assert.notOk(
        sourceMap.lookup(
          [],
          sourceMap.index(
            YAML.parseDocument(`---\n5`)
          )
        )
      )
    })

    it('yields nothing for objects not indexed', () => {
      assert.notOk(sourceMap.lookup([], {}))
    })

  })

  describe('index', () => {
    it('throws if given an unrecognized YAML.Node', () => {
      const sourceMap = new YAMLSourceMap()

      assert.throws(() => { sourceMap.index({}) },
        'Not sure how to handle nodes of type "?"'
      )
    })

    it('can handle comments just fine thank you', () => {
      const sourceMap = new YAMLSourceMap()

      sourceMap.index(
        YAML.parseDocument(dedent`
          ---
          - application: {} # hello!
        `, { keepCstNodes: true })
      )
    })

    it('can handle aliases just fine thank you', () => {
      const sourceMap = new YAMLSourceMap()

      const document = sourceMap.index(
        YAML.parseDocument(dedent`
          ---
          - application: &default
              a: 1
          - application:
              <<: *default
        `, { keepCstNodes: true })
      )

      assert.deepEqual(document[0], { application: { a: 1 } })
      assert.deepEqual(document[0], document[1])
    })

    it('can handle nulls just fine thank you', () => {
      const sourceMap = new YAMLSourceMap()

      const document = sourceMap.index(
        YAML.parseDocument(dedent`
          ---
          - application: null
        `, { keepCstNodes: true })
      )

      assert.equal(document[0].application, null)
    })
  })
})

var fs = require('fs')
var assert = require('./support/assert')
const { describe, it, before } = require('mocha')
const rasterRendererFactory = require('../../lib/raster-renderer')
const mapnik = require('@carto/mapnik')

describe('Render ', function () {
  it('getTile() "jpeg:quality=20" format', function (done) {
    const renderer = rasterRendererFactory({ xml: fs.readFileSync('./test/raster/data/test.xml', 'utf8'), base: './test/raster/data/' })

    renderer.getTile('jpeg:quality=20', 0, 0, 0, function (err, tile, headers, stats) {
      assert.ifError(err)
      assert.ok(stats)
      assert.ok(stats.hasOwnProperty('render'))
      assert.ok(stats.hasOwnProperty('encode'))
      assert.strictEqual(headers['Content-Type'], 'image/jpeg')
      assert.imageEqualsFile(tile, 'test/raster/fixture/tiles/world-jpeg20.jpeg', 0.05, 'jpeg:quality=20', function (err, similarity) {
        assert.ifError(err)
        renderer.close(done)
      })
    })
  })

  it('getTile() renders zoom>30', function (done) {
    const renderer = rasterRendererFactory({ xml: fs.readFileSync('./test/raster/data/test.xml', 'utf8'), base: './test/raster/data/' })
    renderer.getTile('png', 31, 0, 0, function (err, tile, headers) {
      assert.ifError(err)
      assert.imageEqualsFile(tile, './test/raster/fixture/tiles/zoom-31.png', function (err) {
        if (err) throw err
        assert.strictEqual(headers['Content-Type'], 'image/png')
        renderer.close(function () {
          done()
        })
      })
    })
  })

  var tileCoords = [
    [0, 0, 0],
    [1, 0, 0],
    [1, 0, 1],
    [1, 1, 0],
    [1, 1, 1],
    [2, 0, 0],
    [2, 0, 1],
    [2, 0, 2],
    [2, 0, 3],
    [2, 1, 0],
    [2, 1, 1],
    [2, 1, 2],
    [2, 1, 3],
    [2, 2, 0],
    [2, 2, 1],
    [2, 2, 2],
    [2, 2, 3],
    [2, 3, 0],
    [2, 3, 1],
    [2, 3, 2],
    [2, 3, 3]
  ]

  var tileCoordsCompletion = {}
  tileCoords.forEach(function (coords) {
    tileCoordsCompletion['tile_' + coords[0] + '_' + coords[1] + '_' + coords[2]] = true
  })

  describe('getTile() ', function () {
    var renderer
    var completion = {}
    before(function () {
      renderer = rasterRendererFactory({ xml: fs.readFileSync('./test/raster/data/world.xml', 'utf8'), base: './test/raster/data/' })
    })
    it('validates', function (done) {
      var count = 0
      tileCoords.forEach(function (coords, idx, array) {
        renderer.getTile('png', coords[0], coords[1], coords[2],
          function (err, tile, headers) {
            if (err) throw err
            if (tile.solid) {
              assert.strictEqual(Object.keys(renderer.solidCache).length, 1)
            }
            var key = coords[0] + '_' + coords[1] + '_' + coords[2]
            assert.imageEqualsFile(tile, './test/raster/fixture/tiles/transparent_' + key + '.png', function (err, similarity) {
              completion['tile_' + key] = true
              if (err) throw err
              assert.strictEqual(headers['Content-Type'], 'image/png')
              ++count
              if (count === array.length) {
                assert.deepStrictEqual(completion, tileCoordsCompletion)
                renderer.close(done)
              }
            })
          })
      })
    })
  })

  describe('getTile() with XML string', function () {
    var renderer
    var completion = {}
    before(function () {
      renderer = rasterRendererFactory({
        protocol: 'mapnik:',
        search: '?' + Date.now(), // prevents caching
        xml: fs.readFileSync('./test/raster/data/world.xml', 'utf8'),
        base: './test/raster/data/'
      })
    })
    it('validates', function (done) {
      var count = 0
      tileCoords.forEach(function (coords, idx, array) {
        renderer.getTile('png', coords[0], coords[1], coords[2],
          function (err, tile, headers) {
            if (err) throw err
            var key = coords[0] + '_' + coords[1] + '_' + coords[2]
            assert.imageEqualsFile(tile, './test/raster/fixture/tiles/transparent_' + key + '.png', function (err, similarity) {
              completion['tile_' + key] = true
              if (err) throw err
              assert.strictEqual(headers['Content-Type'], 'image/png')
              ++count
              if (count === array.length) {
                assert.deepStrictEqual(completion, tileCoordsCompletion)
                renderer.close(done)
              }
            })
          })
      })
    })
  })

  describe('getTile() with XML string and buffer-size', function () {
    var tileCompletion = {}
    var tiles = [[1, 0, 0], [2, 1, 1]]
    tiles.forEach(function (coords) {
      tileCompletion['tile_buffer_size_' + coords[0] + '_' + coords[1] + '_' + coords[2]] = true
    })

    var renderer
    var completion = {}
    before(function () {
      renderer = rasterRendererFactory({
        protocol: 'mapnik:',
        search: '?' + Date.now(), // prevents caching
        xml: fs.readFileSync('./test/raster/data/world_labels.xml', 'utf8'),
        base: './test/raster/data/',
        bufferSize: 0
      })
    })
    it('validates buffer-size', function (done) {
      var count = 0
      tiles.forEach(function (coords, idx, array) {
        renderer.getTile('png', coords[0], coords[1], coords[2],
          function (err, tile, headers) {
            if (err) throw err
            var key = coords[0] + '_' + coords[1] + '_' + coords[2]
            var filepath = './test/raster/fixture/tiles/buffer_size_' + key + '.png'
            var resultImage = mapnik.Image.fromBytesSync(tile)
            resultImage.save(filepath)
            assert.imageEqualsFile(tile, filepath, function (err, similarity) {
              completion['tile_buffer_size_' + key] = true
              if (err) throw err
              assert.strictEqual(headers['Content-Type'], 'image/png')
              ++count
              if (count === array.length) {
                assert.deepStrictEqual(completion, tileCompletion)
                renderer.close(function (err) {
                  done(err)
                })
              }
            })
          })
      })
    })
  })

  var TESTCOLOR = [ '#A3D979', '#fffacd', '#082910' ]
  describe('Works with render time variables', function () {
    TESTCOLOR.forEach(function (customColor) {
      it('Color ' + customColor, function (done) {
        var uri = {
          protocol: 'mapnik:',
          xml: fs.readFileSync('./test/raster/data/world_variable.xml', 'utf8'),
          base: './test/raster/data/',
          variables: { customColor }
        }

        const renderer = rasterRendererFactory(uri)
        renderer.getTile('png', 2, 2, 2, function (err, tile, headers) {
          if (err) throw err
          assert.imageEqualsFile(tile, './test/raster/fixture/tiles/transparent_2_2_2_' + customColor + '.png', function (err, similarity) {
            if (err) throw err
            assert.strictEqual(headers['Content-Type'], 'image/png')
            renderer.close(done)
          })
        })
      })
    })
  })

  it('Works with metatiles', function (done) {
    var uri = {
      protocol: 'mapnik:',
      xml: fs.readFileSync('./test/raster/data/world.xml', 'utf8'),
      base: './test/raster/data/',
      metatile: 4,
      metrics: true
    }

    const renderer = rasterRendererFactory(uri)
    renderer.getTile('png', 2, 2, 2, function (err, info, headers, stats) {
      assert(!err)
      assert.ok(stats.hasOwnProperty('Mapnik'))
      renderer.close(done)
    })
  })
})

describe('getTile() metrics', function () {
  it('Gets metrics', function (done) {
    var uri = {
      protocol: 'mapnik:',
      xml: fs.readFileSync('./test/raster/data/world.xml', 'utf8'),
      base: './test/raster/data/',
      metrics: true
    }

    const renderer = rasterRendererFactory(uri)
    renderer.getTile('png', 0, 0, 0, function (err, info, headers, stats) {
      assert(!err)
      assert.ok(stats.hasOwnProperty('Mapnik'))
      renderer.close(done)
    })
  })
})

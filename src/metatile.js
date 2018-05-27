const TILE_SIZE = 256
const EARTH_RADIUS = 6378137
const EARTH_DIAMETER = EARTH_RADIUS * 2
const EARTH_CIRCUMFERENCE = EARTH_DIAMETER * Math.PI
const ORIGIN_SHIFT = EARTH_CIRCUMFERENCE / 2
const MAX_RESOLUTION = EARTH_CIRCUMFERENCE / TILE_SIZE

export default class Metatile {
  //       ◄─── dx ──►
  //   ▲   ╬═════════╦═════════╬─────────┼─────────┼─
  //   |   ║         │         ║         │         │
  //  dy   ║  x0,y0  │  x1,y0  ║   ...   │  xn,y0  │
  //   |   ║         │         ║         │         │
  //   ▼  ─╠───── size = 4 ────╣─────────┼─────────┼─
  //       ║         │         ║         │         │
  //       ║  x0,y1  │  x1,y1  ║   ...   │   ...   │
  //       ║         │         ║         │         │
  //      ─╬═════════╬═════════╬─────────┼─────────┼─
  //       │         │         │         │         │
  //       │   ...   │   ...   │   ...   │   ...   │
  //       │         │         │         │         │
  //      ─┼─────────┼─────────┼─────────┼─────────┼─
  //       │         │         │         │         │
  //       │  x0,yn  │   ...   │   ...   │  xn,yn  │
  //       │         │         │         │         │
  //      ─└─────────┼─────────┼─────────┼─────────┼─
  //       │         │         │         │         │

  constructor ({ size = 1 } = {}) {
    this.size = size
  }

  x0y0 ({ z, x, y }) {
    const { dx, dy } = this.dimensions({ z })

    const x0 = (x % dx === 0) ? x : x - (x % dx)
    const y0 = (y % dy === 0) ? y : y - (y % dy)

    return { x0, y0 }
  }

  dimensions ({ z }) {
    let dimension = Math.sqrt(this.size)

    dimension = (this._tileLength({ z }) < dimension) ? 1 : dimension

    return { dx: dimension, dy: dimension }
  }

  dimensionsInPixels ({ z }) {
    const { dx, dy } = this.dimensions({ z })

    return {
      width: dx * TILE_SIZE,
      height: dy * TILE_SIZE
    }
  }

  tiles ({ z, x, y }) {
    const tiles = []
    const { x0, y0 } = this.x0y0({ z, x, y })
    const { dx: dX, dy: dY } = this.dimensions({ z })

    for (let dx = 0; dx < dX; dx++) {
      for (let dy = 0; dy < dY; dy++) {
        tiles.push({
          z,
          x: x0 + dx,
          y: y0 + dy
        })
      }
    }

    return tiles
  }

  boundingBox ({ z, x, y } = {}) {
    const bbox = []
    const resolution = this._resolution({ z })
    const tileLength = this._tileLength({ z })

    const width = Math.min(this.size, tileLength, tileLength - x)
    const height = Math.min(this.size, tileLength, tileLength - y)

    const minx = (x * TILE_SIZE) * resolution - ORIGIN_SHIFT
    const miny = -((y + height) * TILE_SIZE) * resolution + ORIGIN_SHIFT
    const maxx = ((x + width) * TILE_SIZE) * resolution - ORIGIN_SHIFT
    const maxy = -((y * TILE_SIZE) * resolution - ORIGIN_SHIFT)

    bbox.push(minx, miny, maxx, maxy)

    return bbox
  }

  _resolution ({ z }) {
    return MAX_RESOLUTION / this._tileLength({ z })
  }

  _tileLength ({ z }) {
    //  z = 0 => 2^0 = 1
    //  length = 1
    // ◄─────────►
    // ╔═════════╗
    // ║         ║
    // ║   0,0   ║
    // ║         ║
    // ╚═════════╝
    //
    //    z = 1 => 2^1 = 2
    //      length = 2
    // ◄───────────────────►
    // ╔═════════╦═════════╗
    // ║         ║         ║
    // ║   0,0   ║   1,0   ║
    // ║         ║         ║
    // ╠═════════╬═════════╣
    // ║         ║         ║
    // ║   0,1   ║   1,1   ║
    // ║         ║         ║
    // ╚═════════╩═════════╝

    return Math.pow(2, z)
  }
}
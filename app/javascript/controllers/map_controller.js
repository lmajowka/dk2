import { Controller } from "@hotwired/stimulus"

const DEFAULT_MAP = [
  [0, 1, 0, 0, 1, 1, 1, 1, 1, 1, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 0, 1],
  [1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 0, 1],
]

export default class extends Controller {
  static values = {
    tileUrls: Array,
    goalTileId: Number,
    map: Array,
  }

  connect() {
    this.canvas = this.element
    this.ctx = this.canvas.getContext("2d")

    this.grid = this.hasMapValue ? this.mapValue : DEFAULT_MAP

    this.tileImages = []
    this.tilesLoaded = 0

    const urls = this.hasTileUrlsValue ? this.tileUrlsValue : []
    this.tileCount = urls.length

    const onAllTilesLoaded = () => {
      const firstTile = this.tileImages[1]
      if (firstTile) {
        this.tileWidth = firstTile.naturalWidth || firstTile.width
        this.tileHeight = firstTile.naturalHeight || firstTile.height
      } else {
        this.tileWidth = 64
        this.tileHeight = 64
      }

      this.resizeCanvasToMap()
      this.draw()
    }

    if (urls.length === 0) {
      this.tileWidth = 64
      this.tileHeight = 64
      this.resizeCanvasToMap()
      this.draw()
    } else {
      urls.forEach((url, index) => {
        const img = new Image()
        img.onload = () => {
          this.tilesLoaded++
          if (this.tilesLoaded === this.tileCount) {
            onAllTilesLoaded()
          }
        }
        img.src = url
        this.tileImages[index + 1] = img
      })
    }
  }

  resizeCanvasToMap() {
    const rows = this.grid.length
    const cols = rows > 0 ? this.grid[0].length : 0

    this.canvas.width = cols * this.tileWidth
    this.canvas.height = rows * this.tileHeight
  }

  draw() {
    if (!this.tileWidth || !this.tileHeight) return

    const rows = this.grid.length
    const cols = rows > 0 ? this.grid[0].length : 0

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const cell = this.grid[row][col]
        if (cell > 0 && this.tileImages[cell]) {
          this.ctx.drawImage(
            this.tileImages[cell],
            col * this.tileWidth,
            row * this.tileHeight,
            this.tileWidth,
            this.tileHeight,
          )
        }
      }
    }
  }

  tileAt(row, col) {
    if (row < 0 || col < 0) return 0
    if (row >= this.grid.length) return 0
    if (col >= this.grid[0].length) return 0
    return this.grid[row][col]
  }

  isWalkable(row, col) {
    const t = this.tileAt(row, col)
    return t > 0
  }

  isGoal(row, col) {
    const goalId = this.hasGoalTileIdValue ? this.goalTileIdValue : null
    if (goalId === null) return false
    return this.tileAt(row, col) === goalId
  }

  isGoalAtWorld(x, y) {
    const { row, col } = this.worldToCell(x, y)
    return this.isGoal(row, col)
  }

  worldToCell(x, y) {
    if (!this.tileWidth || !this.tileHeight) return { row: -1, col: -1 }

    return {
      row: Math.floor(y / this.tileHeight),
      col: Math.floor(x / this.tileWidth),
    }
  }

  isWalkableAtWorld(x, y) {
    const { row, col } = this.worldToCell(x, y)
    return this.isWalkable(row, col)
  }
}

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
    tileUrl: String,
    map: Array,
  }

  connect() {
    this.canvas = this.element
    this.ctx = this.canvas.getContext("2d")

    this.grid = this.hasMapValue ? this.mapValue : DEFAULT_MAP

    this.tile = new Image()
    this.tile.onload = () => {
      this.tileWidth = this.tile.naturalWidth || this.tile.width
      this.tileHeight = this.tile.naturalHeight || this.tile.height

      this.resizeCanvasToMap()
      this.draw()
    }

    if (this.hasTileUrlValue) {
      this.tile.src = this.tileUrlValue
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
        if (cell === 1) {
          this.ctx.drawImage(
            this.tile,
            col * this.tileWidth,
            row * this.tileHeight,
            this.tileWidth,
            this.tileHeight,
          )
        } else if (cell === 2) {
          this.ctx.fillStyle = "#ff0000"
          this.ctx.fillRect(
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
    return t === 1 || t === 2
  }

  isGoal(row, col) {
    return this.tileAt(row, col) === 2
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
